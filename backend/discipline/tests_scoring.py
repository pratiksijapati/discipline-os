from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time
from goals.models import Goal
from habits.models import Habit
from planner.models import MinimumDay, Routine, RoutineItem
from tasks.models import DailyFocus, Task
from workouts.models import Exercise, PlanExercise, WorkoutPlan

from .models import DailyScore
from .scoring import max_possible, rating_for

KTM = ZoneInfo("Asia/Kathmandu")
MON = date(2026, 10, 5)


class ScoringCase(AuthedAPITestCase):
    """Shared setup and helpers for score tests."""

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


class ScoringTests(ScoringCase):
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

    def test_everything_still_possible_before_the_wake_deadline(self):
        self.setup_full_system()
        with frozen_local_time(2026, 10, 5, 6, 0):
            data = self.score()
        self.assertEqual(data["score"], 0)
        self.assertEqual(data["max_possible"], 100)

    def test_missed_wake_deadline_caps_wake_at_half(self):
        self.setup_full_system()
        with frozen_local_time(2026, 10, 5, 9, 0):
            data = self.score()
        wake = next(c for c in data["breakdown"] if c["key"] == "wake_up")
        self.assertEqual(wake["max_ratio"], 0.5)
        self.assertIn("half points", wake["detail"])
        # The challenge was never used, so the hint points at the routine step.
        self.assertIn("Tick", wake["detail"])
        # 7.5 (late wake) + 85 (everything else) = 92.5 → 92
        self.assertEqual(data["max_possible"], 92)

    def test_max_possible_after_a_late_wake_tick(self):
        self.setup_full_system()
        self.tick("Wake up", 7, 30)
        with frozen_local_time(2026, 10, 5, 7, 31):
            data = self.score()
        self.assertEqual(data["score"], 11)
        self.assertEqual(data["max_possible"], 92)

    def test_perfect_day_has_nothing_left_to_reach(self):
        self.setup_full_system()
        self.do_everything()
        with frozen_local_time(2026, 10, 5, 22):
            self.client.post(reverse("reflection-complete"), {"day_rating": 5}, format="json")
            data = self.score()
        self.assertEqual(data["max_possible"], 100)

    def test_max_possible_of_a_finished_day_is_its_score(self):
        breakdown = [{"applicable": True, "weight": 50, "ratio": 0.2, "max_ratio": 1.0}]
        self.assertEqual(max_possible(10, breakdown, is_final=True), 10)
        self.assertIsNone(max_possible(None, breakdown, is_final=False))
        # Rows stored before max_ratio existed count as fully reachable.
        self.assertEqual(max_possible(10, [{"applicable": True, "weight": 50, "ratio": 0.2}], is_final=False), 100)

    def test_focus_alone_counts_as_the_important_part(self):
        DailyFocus.objects.create(user=self.user, date=MON, title="Ship the API")
        with frozen_local_time(2026, 10, 5, 9):
            part = next(c for c in self.score()["breakdown"] if c["key"] == "important_tasks")
        self.assertTrue(part["applicable"])
        self.assertEqual((part["ratio"], part["detail"]), (0, "Today's focus is still open"))
        DailyFocus.objects.filter(user=self.user).update(completed=True)
        with frozen_local_time(2026, 10, 5, 10):
            part = next(c for c in self.score()["breakdown"] if c["key"] == "important_tasks")
        self.assertEqual(part["ratio"], 1)

    def test_focus_joins_the_important_tasks(self):
        self.setup_full_system()  # one high-priority task due today
        DailyFocus.objects.create(user=self.user, date=MON, title="Ship the API", completed=True)
        with frozen_local_time(2026, 10, 5, 9):
            data = self.client.get(reverse("dashboard-today")).data
        part = next(c for c in data["score"]["breakdown"] if c["key"] == "important_tasks")
        self.assertEqual((part["ratio"], part["detail"]), (0.5, "1/2 incl. today's focus"))
        self.assertEqual(data["focus"]["title"], "Ship the API")
        self.assertEqual(data["summary"]["focus"], {"title": "Ship the API", "completed": True})

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


class MinimumDayScoringTests(ScoringCase):
    def test_minimum_checklist_stands_in_for_the_routine_and_the_rest_still_counts(self):
        self.setup_full_system()  # morning routine, Monday workout, task, habit, goal
        self.client.put(reverse("minimum-checklist"), {"items": ["Drink water", "10 push-ups"]}, format="json")
        with frozen_local_time(2026, 10, 5, 9):
            self.client.post(reverse("minimum-day"), {}, format="json")
            step = self.client.get(reverse("minimum-day")).data["checklist"]["items"][0]
            self.client.post(reverse("routine-item-check", args=[step["id"]]), {"done": True}, format="json")
            data = self.score()
        parts = {c["key"]: c for c in data["breakdown"]}
        routine = parts["morning_routine"]
        self.assertEqual((routine["ratio"], routine["detail"], routine["weight"]), (0.5, "1/2 minimum-day steps", 10))
        self.assertTrue(routine["minimum_day"])
        self.assertTrue(data["minimum_day"])
        # Not a free pass: the planned workout still applies and still counts as not done.
        self.assertTrue(parts["workout"]["applicable"])
        self.assertEqual(parts["workout"]["ratio"], 0)


def _row(user, day, score, minimum_done=None):
    breakdown = [{"key": "morning_routine", "applicable": True, "weight": 10, "ratio": 1.0 if minimum_done else 0.4}]
    if minimum_done is not None:
        breakdown[0]["minimum_day"] = True
    return DailyScore(user=user, date=day, score=score, breakdown=breakdown, is_final=True)


class MinimumDayStreakTests(ScoringCase):
    def streak(self, rows, today_row):
        from .engine import streaks

        DailyScore.objects.bulk_create(rows)
        return streaks(self.user, today_row.date, today_row)["discipline"]["current"]

    def test_a_completed_minimum_day_holds_the_streak(self):
        d = lambda n: date(2026, 10, n)  # noqa: E731
        rows = [_row(self.user, d(1), 80), _row(self.user, d(2), 80), _row(self.user, d(3), 40, minimum_done=True), _row(self.user, d(4), 80)]
        # 1, 2, (3 held: not counted, not broken), 4, 5
        self.assertEqual(self.streak(rows, _row(self.user, d(5), 80)), 4)

    def test_only_two_minimum_days_per_week_are_protected(self):
        d = lambda n: date(2026, 10, n)  # noqa: E731  — weeks start on Sunday (Oct 4)
        rows = [
            _row(self.user, d(3), 80),
            _row(self.user, d(4), 40, minimum_done=True),
            _row(self.user, d(5), 40, minimum_done=True),
            _row(self.user, d(6), 40, minimum_done=True),  # third this week: breaks
        ]
        self.assertEqual(self.streak(rows, _row(self.user, d(7), 80)), 1)

    def test_an_unfinished_minimum_day_breaks_like_any_low_day(self):
        d = lambda n: date(2026, 10, n)  # noqa: E731
        rows = [_row(self.user, d(3), 80), _row(self.user, d(4), 40, minimum_done=False)]
        self.assertEqual(self.streak(rows, _row(self.user, d(5), 80)), 1)

