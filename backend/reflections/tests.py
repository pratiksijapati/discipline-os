from datetime import date, time

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time
from planner.models import ScheduleItem
from tasks.models import Task

from .models import DailyReflection

MON = date(2026, 10, 5)


class NightReviewTests(AuthedAPITestCase):
    def current(self):
        return self.client.get(reverse("reflection-current")).data

    def save(self, **data):
        return self.client.patch(reverse("reflection-current"), data, format="json")

    def complete(self, **data):
        return self.client.post(reverse("reflection-complete"), data, format="json")

    def make_day(self):
        ScheduleItem.objects.create(
            user=self.user, title="Workout", date=MON, occurrence_date=MON, start_time=time(6), status="completed"
        )
        ScheduleItem.objects.create(user=self.user, title="Study", date=MON, occurrence_date=MON, start_time=time(20))
        ScheduleItem.objects.create(
            user=self.user, title="Night review", category="night", date=MON, occurrence_date=MON, start_time=time(22, 30)
        )
        Task.objects.create(user=self.user, title="Ship it", due_date=MON, status="completed")
        Task.objects.create(user=self.user, title="Email", due_date=MON)

    def test_draft_autosaves_and_stats_are_live(self):
        self.make_day()
        with frozen_local_time(2026, 10, 5, 21, 30):
            data = self.current()
            self.assertEqual(data["date"], "2026-10-05")
            self.assertIsNone(data["reflection"])
            self.assertEqual(data["stats"]["completed"], 2)  # workout + task
            res = self.save(went_well="Shipped the feature", energy=4)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data["reflection"]["went_well"], "Shipped the feature")
            self.assertFalse(res.data["reflection"]["is_completed"])
            self.assertEqual(self.current()["reflection"]["energy"], 4)

    def test_complete_requires_rating_and_freezes_stats(self):
        self.make_day()
        with frozen_local_time(2026, 10, 5, 22, 40):
            res = self.complete()
            self.assertEqual(res.status_code, 400)
            self.assertIn("day_rating", res.data["errors"])

            res = self.complete(day_rating=4, improve="Start study earlier")
            self.assertEqual(res.status_code, 200)
            stats = res.data["stats"]
            self.assertTrue(res.data["reflection"]["is_completed"])
            # The schedule's "Night review" item is ticked off automatically.
            review = ScheduleItem.objects.get(title="Night review")
            self.assertEqual(review.status, "completed")
            # Workout, Ship it and the review itself are done; Study (20:00) and Email are not.
            self.assertEqual((stats["completed"], stats["not_done"]), (3, 2))

            # Later changes don't rewrite the saved summary.
            Task.objects.filter(title="Email").update(status="completed")
            self.assertEqual(self.current()["stats"], stats)

    def test_after_midnight_reviews_yesterday(self):
        with frozen_local_time(2026, 10, 6, 0, 45):
            self.assertEqual(self.current()["date"], "2026-10-05")
            self.complete(day_rating=5)
            # Once yesterday is done, the next review is for the new day.
            self.assertEqual(self.current()["date"], "2026-10-06")

    def test_history_lists_only_completed(self):
        DailyReflection.objects.create(user=self.user, date=date(2026, 10, 3), day_rating=3, completed_at="2026-10-03T17:00Z")
        DailyReflection.objects.create(user=self.user, date=date(2026, 10, 4), went_well="draft only")
        DailyReflection.objects.create(user=self.other, date=date(2026, 10, 3), day_rating=5, completed_at="2026-10-03T17:00Z")
        results = self.client.get(reverse("reflection-list")).data["results"]
        self.assertEqual([r["date"] for r in results], ["2026-10-03"])

    def test_validation_and_ownership(self):
        with frozen_local_time(2026, 10, 5, 21):
            self.assertEqual(self.save(mood=9).status_code, 400)
        theirs = DailyReflection.objects.create(user=self.other, date=MON, day_rating=2)
        self.assertEqual(self.client.get(reverse("reflection-detail", args=[theirs.id])).status_code, 404)

    def test_dashboard_reports_review_state(self):
        with frozen_local_time(2026, 10, 5, 22):
            self.assertFalse(self.client.get(reverse("dashboard-today")).data["reflection"]["completed"])
            self.complete(day_rating=5)
            state = self.client.get(reverse("dashboard-today")).data["reflection"]
        self.assertEqual(state, {"completed": True, "day_rating": 5})
