from datetime import date, time

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time

from .models import ScheduleItem, ScheduleTemplate
from .services import ensure_occurrences

# 2026-10-05 is a Monday.
MON, TUE, WED, SAT, SUN = (date(2026, 10, d) for d in (5, 6, 7, 10, 11))


class RecurrenceRuleTests(AuthedAPITestCase):
    def template(self, **kwargs):
        defaults = {"user": self.user, "title": "Workout", "start_time": time(6, 15), "start_date": MON}
        return ScheduleTemplate.objects.create(**{**defaults, **kwargs})

    def test_rules(self):
        weekdays = self.template(repeat="weekdays")
        self.assertTrue(weekdays.occurs_on(MON))
        self.assertFalse(weekdays.occurs_on(SAT))

        selected = self.template(repeat="selected_days", days_of_week=[0, 1, 3, 5])  # Mon Tue Thu Sat
        self.assertTrue(selected.occurs_on(TUE))
        self.assertFalse(selected.occurs_on(WED))
        self.assertTrue(selected.occurs_on(SAT))

        weekly = self.template(repeat="weekly")
        self.assertTrue(weekly.occurs_on(date(2026, 10, 12)))
        self.assertFalse(weekly.occurs_on(TUE))

        ended = self.template(repeat="daily", end_date=TUE)
        self.assertFalse(ended.occurs_on(WED))
        self.assertFalse(ended.occurs_on(date(2026, 10, 4)))  # before start_date

    def test_ensure_is_idempotent(self):
        self.template(repeat="daily")
        ensure_occurrences(self.user, MON, SUN)
        ensure_occurrences(self.user, MON, SUN)
        self.assertEqual(ScheduleItem.objects.filter(user=self.user).count(), 7)


class ScheduleApiTests(AuthedAPITestCase):
    def create_template(self, **data):
        payload = {"title": "Study", "start_time": "20:00", "end_time": "21:00", "repeat": "daily", "start_date": "2026-10-05"}
        res = self.client.post(reverse("schedule-template-list"), {**payload, **data}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def list_day(self, day):
        res = self.client.get(reverse("schedule-item-list"), {"date": day.isoformat()})
        self.assertEqual(res.status_code, 200, res.data)
        return res.data

    def test_recurring_items_appear_without_duplicates(self):
        self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            first = self.list_day(MON)
            second = self.list_day(MON)
        self.assertEqual(len(first), 1)
        self.assertEqual(first[0]["id"], second[0]["id"])
        self.assertTrue(first[0]["is_recurring"])

    def test_selected_days_requires_days(self):
        res = self.client.post(
            reverse("schedule-template-list"),
            {"title": "X", "start_time": "06:00", "repeat": "selected_days", "days_of_week": []},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("days_of_week", res.data["errors"])

    def test_end_time_must_follow_start(self):
        res = self.client.post(
            reverse("schedule-item-list"),
            {"title": "X", "date": "2026-10-05", "start_time": "09:00", "end_time": "08:00"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("end_time", res.data["errors"])

    def test_rescheduled_occurrence_is_not_recreated(self):
        self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            item = self.list_day(MON)[0]
            res = self.client.patch(
                reverse("schedule-item-detail", args=[item["id"]]), {"date": "2026-10-06"}, format="json"
            )
            self.assertTrue(res.data["is_customized"])
            self.assertEqual(self.list_day(MON), [])
            self.assertEqual(len(self.list_day(TUE)), 2)  # moved one + Tuesday's own

    def test_deleted_occurrence_stays_deleted(self):
        self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            item = self.list_day(MON)[0]
            self.client.delete(reverse("schedule-item-detail", args=[item["id"]]))
            self.assertEqual(self.list_day(MON), [])

    def test_template_edit_updates_untouched_future_only(self):
        template = self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            mon, tue = self.list_day(MON)[0], self.list_day(TUE)[0]
            self.client.patch(reverse("schedule-item-detail", args=[mon["id"]]), {"status": "completed"}, format="json")
            self.client.patch(
                reverse("schedule-template-detail", args=[template["id"]]), {"title": "Deep study"}, format="json"
            )
            self.assertEqual(self.list_day(MON)[0]["title"], "Study")  # completed: kept as history
            new_tue = self.list_day(TUE)[0]
            self.assertEqual(new_tue["title"], "Deep study")
            self.assertNotEqual(new_tue["id"], tue["id"])

    def test_complete_stamps_and_reopen_clears(self):
        with frozen_local_time(2026, 10, 5, 8):
            res = self.client.post(
                reverse("schedule-item-list"), {"title": "Run", "date": "2026-10-05", "start_time": "06:00"}, format="json"
            )
            url = reverse("schedule-item-detail", args=[res.data["id"]])
            done = self.client.patch(url, {"status": "completed"}, format="json").data
            self.assertIsNotNone(done["completed_at"])
            reopened = self.client.patch(url, {"status": "upcoming"}, format="json").data
            self.assertIsNone(reopened["completed_at"])

    def test_missed_is_derived(self):
        with frozen_local_time(2026, 10, 5, 10):
            res = self.client.post(
                reverse("schedule-item-list"),
                {"title": "Wake up", "date": "2026-10-05", "start_time": "06:00", "end_time": "06:10"},
                format="json",
            )
            self.assertEqual(res.data["display_status"], "missed")
            self.assertEqual(res.data["status"], "upcoming")

    def test_cannot_touch_other_users_items(self):
        other_item = ScheduleItem.objects.create(
            user=self.other, title="Secret", date=MON, occurrence_date=MON, start_time=time(7)
        )
        url = reverse("schedule-item-detail", args=[other_item.id])
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"title": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(self.list_day(MON), [])

    def test_range_limit(self):
        res = self.client.get(reverse("schedule-item-list"), {"start": "2026-01-01", "end": "2026-12-31"})
        self.assertEqual(res.status_code, 400)
