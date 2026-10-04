from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time
from goals.models import Goal
from habits.models import Habit
from planner.models import Routine, RoutineItem
from tasks.models import Task
from workouts.models import Exercise, PlanExercise, WorkoutPlan

from .models import DailyScore
from .scoring import rating_for

KTM = ZoneInfo("Asia/Kathmandu")
MON = date(2026, 10, 5)


class ScoringTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        # Account "created" a while ago so past days can be scored.
        self.user.created_at = datetime(2026, 9, 1, tzinfo=KTM)
        self.user.save(update_fields=["created_at"])

    def setup_full_system(self):
        routine = Routine.objects.create(user=self.user, name="Morning", is_default=True)
        for i, title in enumerate(["Wake up", "Drink water", "Shower"]):
            RoutineItem.objects.create(routine=routine, title=title, position=i)
        bench = Exercise.objects.create(user=self.user, name="Bench")
        plan = WorkoutPlan.objects.create(user=self.user, name="Push Day", days_of_week=[0])  # Mondays
        PlanExercise.objects.create(plan=plan, exercise=bench)
        Task.objects.create(user=self.user, title="Ship feature", due_date=MON, priority="high")
        Habit.objects.create(user=self.user, name="Water", habit_type="quantity", target_value=8, unit="glasses", start_date=date(2026, 9, 1))
        Goal.objects.create(user=self.user, title="Learn React", measure="duration", target_value=30, start_date=date(2026, 9, 1))
        self.plan = plan
        self.steps = {s.title: s for s in routine.items.all()}

    def score(self):
        return self.client.get(reverse("discipline-today")).data

    def tick(self, title, hour, minute):
        with frozen_local_time(2026, 10, 5, hour, minute):
            self.client.post(reverse("routine-item-check", args=[self.steps[title].id]), {"done": True}, format="json")

    def do_everything(self, wake=(6, 5)):
        self.tick("Wake up", *wake)
        with frozen_local_time(2026, 10, 5, 8):
            for title in ("Drink water", "Shower"):
                self.client.post(reverse("routine-item-check", args=[self.steps[title].id]), {"done": True}, format="json")
            session = self.client.post(reverse("workout-list"), {"plan": self.plan.id}, format="json").data
            self.client.post(
                reverse("workout-sets", args=[session["id"]]),
                {"session_exercise": session["exercises"][0]["id"], "reps": 10},
                format="json",
            )
            self.client.post(reverse("workout-complete", args=[session["id"]]))
            task = Task.objects.get(title="Ship feature")
            self.client.patch(reverse("task-detail", args=[task.id]), {"status": "completed"}, format="json")
            self.client.post(reverse("habit-log", args=[Habit.objects.get().id]), {"value": 8}, format="json")
            self.client.post(reverse("goal-progress", args=[Goal.objects.get().id]), {"amount": "1.5"}, format="json")

    def test_untracked_day_has_no_score(self):
        with frozen_local_time(2026, 10, 5, 9):
            data = self.score()
        self.assertIsNone(data["score"])
        self.assertIsNone(data["rating"])

    def test_perfect_day_scores_100_with_spec_weights(self):
        self.setup_full_system()
        self.do_everything()
        with frozen_local_time(2026, 10, 5, 22):
            self.client.post(reverse("reflection-complete"), {"day_rating": 5}, format="json")
            data = self.score()
        self.assertEqual(data["score"], 100)
        self.assertEqual(data["rating"], "Excellent")
        weights = {c["key"]: c["weight"] for c in data["breakdown"]}
        self.assertEqual(
            weights,
            {"wake_up": 15, "morning_routine": 10, "workout": 20, "important_tasks": 25, "habits": 15, "growth": 10, "reflection": 5},
        )

    def test_morning_score_grows_and_late_wake_gets_half(self):
        self.setup_full_system()
        self.tick("Wake up", 7, 30)  # deadline is 6:15
        with frozen_local_time(2026, 10, 5, 7, 31):
            data = self.score()
        wake = next(c for c in data["breakdown"] if c["key"] == "wake_up")
        self.assertEqual(wake["ratio"], 0.5)
        self.assertIn("7:30 AM", wake["detail"])
        routine = next(c for c in data["breakdown"] if c["key"] == "morning_routine")
        self.assertEqual(routine["detail"], "1/3 steps")
        # 7.5 (wake) + 3.33 (routine) out of 100 applicable points
        self.assertEqual(data["score"], 11)
        self.assertEqual(data["rating"], "Reset tomorrow")

    def test_rest_day_does_not_count_workout(self):
        self.setup_full_system()
        self.plan.days_of_week = [2]  # Wednesdays only
        self.plan.save()
        with frozen_local_time(2026, 10, 5, 9):
            workout = next(c for c in self.score()["breakdown"] if c["key"] == "workout")
        self.assertFalse(workout["applicable"])
        self.assertEqual(workout["detail"], "Rest day")

    def test_custom_weights(self):
        self.setup_full_system()
        res = self.client.patch(reverse("user-settings"), {"score_weights": {"workout": 0, "habits": 40}}, format="json")
        self.assertEqual(res.data["score_weights"]["habits"], 40)
        self.assertEqual(res.data["score_weights"]["wake_up"], 15)
        with frozen_local_time(2026, 10, 5, 9):
            self.client.post(reverse("habit-log", args=[Habit.objects.get().id]), {"value": 8}, format="json")
            data = self.score()
        workout = next(c for c in data["breakdown"] if c["key"] == "workout")
        self.assertFalse(workout["applicable"])
        # habits 40 earned of (15+10+25+40+10+5)=105 applicable
        self.assertEqual(data["score"], round(100 * 40 / 105))

        bad = self.client.patch(reverse("user-settings"), {"score_weights": {"sleep": 10}}, format="json")
        self.assertEqual(bad.status_code, 400)
        bad = self.client.patch(reverse("user-settings"), {"score_weights": {"workout": 150}}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_past_days_are_final_and_frozen(self):
        self.setup_full_system()
        with frozen_local_time(2026, 10, 6, 9):
            self.score()
            monday = DailyScore.objects.get(user=self.user, date=MON)
            self.assertTrue(monday.is_final)
            frozen = monday.score
            # Completing Monday's task afterwards doesn't rewrite Monday's final score.
            Task.objects.filter(title="Ship feature").update(status="completed")
            self.score()
        self.assertEqual(DailyScore.objects.get(user=self.user, date=MON).score, frozen)

    def test_discipline_streak(self):
        self.setup_full_system()
        for back, value in [(1, 85), (2, 72), (3, None), (4, 90), (5, 40), (6, 95)]:
            DailyScore.objects.create(user=self.user, date=MON - timedelta(days=back), score=value, is_final=True)
        # Fill any earlier days as untracked so finalisation doesn't touch them.
        day = date(2026, 9, 1)
        while day < MON - timedelta(days=6):
            DailyScore.objects.get_or_create(user=self.user, date=day, defaults={"score": None, "is_final": True})
            day += timedelta(days=1)
        with frozen_local_time(2026, 10, 5, 9):
            streaks = self.score()["streaks"]
        # Today (low so far) doesn't break it; untracked Oct 2 is skipped: 85, 72, 90 → 3. Best: 3.
        self.assertEqual(streaks["discipline"], {"current": 3, "best": 3, "threshold": 70, "unit": "days"})
        self.assertEqual(streaks["workout"]["unit"], "weeks")

    def test_review_summary_includes_score(self):
        self.setup_full_system()
        with frozen_local_time(2026, 10, 5, 22):
            stats = self.client.post(reverse("reflection-complete"), {"day_rating": 3}, format="json").data["stats"]
        self.assertIn("score", stats)
        self.assertEqual(stats["rating"], rating_for(stats["score"]))

    def test_ratings(self):
        self.assertEqual(
            [rating_for(s) for s in (100, 90, 89, 80, 79, 70, 69, 60, 59, 0)],
            ["Excellent", "Excellent", "Strong", "Strong", "Good", "Good", "Needs improvement", "Needs improvement", "Reset tomorrow", "Reset tomorrow"],
        )

    def test_dashboard_includes_score_and_history_endpoint(self):
        self.setup_full_system()
        with frozen_local_time(2026, 10, 5, 9):
            dash = self.client.get(reverse("dashboard-today")).data
            history = self.client.get(reverse("discipline-scores"), {"start": "2026-10-01", "end": "2026-10-05"}).data
        self.assertIn("score", dash["score"])
        self.assertIn("discipline", dash["streaks"])
        self.assertEqual([h["date"] for h in history][-1], "2026-10-05")
        self.assertTrue(all(h["is_final"] for h in history[:-1]))
