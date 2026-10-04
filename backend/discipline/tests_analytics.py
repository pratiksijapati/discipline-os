from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time
from goals.models import Goal, GoalProgress
from planner.models import ScheduleItem
from reflections.models import DailyReflection
from tasks.models import Task
from workouts.models import WorkoutSession

from .models import DailyScore

KTM = ZoneInfo("Asia/Kathmandu")
# Week starts Sunday: Sep 27 – Oct 3 is "last week", Oct 4 – Oct 10 is "this week".
LAST_WEEK = [date(2026, 9, 27) + timedelta(days=i) for i in range(7)]


def comp(key, ratio, applicable=True):
    return {"key": key, "label": key, "weight": 10, "applicable": applicable, "ratio": ratio, "points": 0, "detail": ""}


class AnalyticsTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        self.user.created_at = datetime(2026, 9, 1, tzinfo=KTM)
        self.user.save(update_fields=["created_at"])
        # Every earlier day is untracked, so finalisation leaves our fixtures alone.
        day = date(2026, 9, 1)
        while day < date(2026, 10, 5):
            DailyScore.objects.create(user=self.user, date=day, score=None, is_final=True, breakdown=[])
            day += timedelta(days=1)

    def seed_last_week(self):
        scores = [60, 92, 75, 80, 70, 85, 50]
        wake = [1, 1, 1, 0.5, 1, 1, 1]
        habits = [1, 0.5, 1, 1, 0.5, 1, 0]
        for day, score, w, h in zip(LAST_WEEK, scores, wake, habits):
            DailyScore.objects.filter(user=self.user, date=day).update(
                score=score,
                breakdown=[comp("wake_up", w), comp("habits", h), comp("morning_routine", 0.4), comp("workout", 0, False)],
            )
        for i, day in enumerate(LAST_WEEK[:5]):
            Task.objects.create(user=self.user, title=f"T{i}", due_date=day, status="completed" if i < 4 else "pending")
        for day in LAST_WEEK[:4]:
            WorkoutSession.objects.create(
                user=self.user, name="Push", date=day, status="completed",
                started_at=datetime(day.year, day.month, day.day, 6, tzinfo=KTM), duration_seconds=2700,
            )
        goal = Goal.objects.create(user=self.user, title="React", measure="duration", target_value=30, start_date=LAST_WEEK[0])
        GoalProgress.objects.create(goal=goal, user=self.user, date=LAST_WEEK[1], delta=2, value_after=2)
        ScheduleItem.objects.create(
            user=self.user, title="Study", category="study", date=LAST_WEEK[2], occurrence_date=LAST_WEEK[2],
            start_time=time(20), end_time=time(21, 20), status="completed",
        )
        DailyReflection.objects.create(
            user=self.user, date=LAST_WEEK[3], day_rating=4, improve="Sleep earlier", completed_at=datetime(2026, 9, 30, 22, tzinfo=KTM)
        )

    def test_weekly_review(self):
        self.seed_last_week()
        with frozen_local_time(2026, 10, 5, 9):
            review = self.client.get(reverse("progress-weekly"), {"offset": 1}).data
        self.assertEqual((review["week_start"], review["week_end"]), ("2026-09-27", "2026-10-03"))
        self.assertFalse(review["is_current"])
        self.assertEqual(review["score"]["average"], 73)
        self.assertEqual(review["best_day"], {"date": "2026-09-28", "score": 92})
        self.assertEqual(review["wake_up"], {"success_days": 6, "tracked_days": 7})
        self.assertEqual(review["workouts"], {"count": 4, "target": 4})
        self.assertEqual((review["tasks"]["completed"], review["tasks"]["total"]), (4, 5))
        self.assertEqual(review["learning_hours"], 3.33)  # 2 h goal + 1 h 20 m study
        self.assertEqual(review["needs_attention"]["key"], "morning_routine")
        self.assertIn("routine", review["focus_next_week"].lower())
        self.assertTrue(any("Woke up on time 6 of 7" in s for s in review["went_well"]))
        self.assertTrue(any("workout target" in s for s in review["went_well"]))
        self.assertEqual(review["your_notes"], ["Sleep earlier"])

    def test_progress_range(self):
        self.seed_last_week()
        with frozen_local_time(2026, 10, 5, 9):
            data = self.client.get(reverse("progress"), {"range": "30d"}).data
        self.assertEqual(len(data["score"]["series"]), 30)
        self.assertEqual(data["score"]["series"][-1]["date"], "2026-10-05")
        self.assertEqual(data["score"]["average"], 73)
        self.assertEqual(data["score"]["best"], {"date": "2026-09-28", "score": 92})
        self.assertEqual(data["score"]["days_at_threshold"], 5)
        self.assertEqual(data["wake_up"]["success_days"], 6)
        self.assertEqual(data["habits"]["rate"], 71)
        self.assertEqual(data["tasks"]["rate"], 80)
        self.assertEqual(data["workouts"]["count"], 4)
        self.assertEqual(data["workouts"]["minutes"], 180)
        self.assertEqual(sum(w["count"] for w in data["workouts"]["per_week"]), 4)
        self.assertEqual(data["growth"]["learning_hours"], 3.33)
        self.assertIn("discipline", data["streaks"])

    def test_bad_params(self):
        self.assertEqual(self.client.get(reverse("progress"), {"range": "2y"}).status_code, 400)
        self.assertEqual(self.client.get(reverse("progress-weekly"), {"offset": "x"}).status_code, 400)

    def test_empty_account(self):
        with frozen_local_time(2026, 10, 5, 9):
            data = self.client.get(reverse("progress"), {"range": "7d"}).data
            review = self.client.get(reverse("progress-weekly")).data
        self.assertIsNone(data["score"]["average"])
        self.assertIsNone(data["tasks"]["rate"])
        self.assertIsNone(review["needs_attention"])
        self.assertTrue(review["is_current"])

    def test_other_users_data_never_counts(self):
        self.seed_last_week()
        Task.objects.create(user=self.other, title="Theirs", due_date=LAST_WEEK[0], status="completed")
        DailyScore.objects.create(user=self.other, date=LAST_WEEK[0], score=100, is_final=True)
        with frozen_local_time(2026, 10, 5, 9):
            review = self.client.get(reverse("progress-weekly"), {"offset": 1}).data
        self.assertEqual(review["tasks"]["total"], 5)
        self.assertEqual(review["score"]["average"], 73)
