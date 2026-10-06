from datetime import date, time

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time

from .models import Routine, RoutineItem, ScheduleItem, ScheduleTemplate
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

    def test_moved_occurrence_survives_template_edits_and_leaves_template_alone(self):
        template = self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            item = self.list_day(MON)[0]
            self.client.patch(
                reverse("schedule-item-detail", args=[item["id"]]),
                {"date": "2026-10-06", "start_time": "07:00", "end_time": "08:00"},
                format="json",
            )
            # The routine itself is unchanged.
            res = self.client.get(reverse("schedule-template-detail", args=[template["id"]]))
            self.assertEqual((res.data["start_time"], res.data["end_time"]), ("20:00:00", "21:00:00"))
            # Editing the routine later never removes or rewrites the moved one.
            self.client.patch(reverse("schedule-template-detail", args=[template["id"]]), {"title": "Deep study"}, format="json")
            tue = {i["id"]: i for i in self.list_day(TUE)}
            self.assertEqual(tue[item["id"]]["title"], "Study")
            self.assertEqual(tue[item["id"]]["start_time"], "07:00:00")
            self.assertEqual(len(tue), 2)

    def test_moving_a_skipped_item_later_today_reopens_it(self):
        self.create_template()
        with frozen_local_time(2026, 10, 5, 8):
            item = self.list_day(MON)[0]
            url = reverse("schedule-item-detail", args=[item["id"]])
            self.client.patch(url, {"status": "skipped"}, format="json")
            res = self.client.patch(url, {"start_time": "22:00", "end_time": "23:00", "status": "upcoming"}, format="json")
            self.assertEqual(res.status_code, 200, res.data)
            self.assertEqual((res.data["status"], res.data["start_time"]), ("upcoming", "22:00:00"))
            self.assertEqual(len(self.list_day(MON)), 1)

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


class RoutineApiTests(AuthedAPITestCase):
    SUGGESTED = ["Wake up", "Drink water", "Brush / wash", "Dance challenge", "Workout", "Shower", "Breakfast"]

    def create_routine(self, name="Morning routine", **extra):
        payload = {"name": name, "items": [{"title": t} for t in self.SUGGESTED], **extra}
        res = self.client.post(reverse("routine-list"), payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def today(self):
        return self.client.get(reverse("routine-today")).data

    def test_first_routine_becomes_default_with_ordered_items(self):
        routine = self.create_routine()
        today = self.today()
        self.assertEqual(today["routine"]["id"], routine["id"])
        self.assertTrue(today["routine"]["is_default"])
        self.assertEqual([i["title"] for i in today["items"]], self.SUGGESTED)
        self.assertEqual((today["completed"], today["total"]), (0, 7))

    def test_only_one_default(self):
        first = self.create_routine()
        second = self.create_routine(name="Night routine", is_default=True)
        self.assertEqual(self.today()["routine"]["id"], second["id"])
        self.client.patch(reverse("routine-detail", args=[first["id"]]), {"is_default": True}, format="json")
        self.assertEqual(self.today()["routine"]["id"], first["id"])
        self.assertEqual(Routine.objects.filter(user=self.user, is_default=True).count(), 1)

    def test_check_is_idempotent_and_disabled_items_dont_count(self):
        self.create_routine()
        items = self.today()["items"]
        url = reverse("routine-item-check", args=[items[0]["id"]])
        self.client.post(url, {"done": True}, format="json")
        res = self.client.post(url, {"done": True}, format="json")
        self.assertEqual(res.data["completed"], 1)
        self.client.patch(reverse("routine-item-detail", args=[items[6]["id"]]), {"is_enabled": False}, format="json")
        self.assertEqual(self.today()["total"], 6)
        res = self.client.post(url, {"done": False}, format="json")
        self.assertEqual(res.data["completed"], 0)

    def test_reorder_and_add_item(self):
        routine = self.create_routine()
        ids = [i["id"] for i in routine["items"]]
        res = self.client.post(reverse("routine-reorder", args=[routine["id"]]), {"item_ids": ids[::-1]}, format="json")
        self.assertEqual(res.data["items"][0]["title"], "Breakfast")
        res = self.client.post(reverse("routine-item-list"), {"routine": routine["id"], "title": "Stretch"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.today()["items"][-1]["title"], "Stretch")

    def test_deleting_default_promotes_another(self):
        first = self.create_routine()
        second = self.create_routine(name="Night routine")
        self.client.delete(reverse("routine-detail", args=[first["id"]]))
        self.assertEqual(self.today()["routine"]["id"], second["id"])

    def test_ownership(self):
        foreign = Routine.objects.create(user=self.other, name="Theirs")
        foreign_item = RoutineItem.objects.create(routine=foreign, title="Secret")
        res = self.client.post(reverse("routine-item-list"), {"routine": foreign.id, "title": "Sneaky"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.post(reverse("routine-item-check", args=[foreign_item.id]), {"done": True}, format="json").status_code, 404)
        self.assertEqual(self.client.get(reverse("routine-detail", args=[foreign.id])).status_code, 404)
        self.assertIsNone(self.today()["routine"])


class MinimumDayApiTests(AuthedAPITestCase):
    def state(self):
        return self.client.get(reverse("minimum-day")).data

    def test_set_checklist_start_tick_and_stop(self):
        with frozen_local_time(2026, 10, 5, 8):
            self.assertFalse(self.state()["configured"])
            res = self.client.post(reverse("minimum-day"), {"reason": "Travelling"}, format="json")
            self.assertEqual(res.status_code, 400)
            self.assertIn("checklist", res.data["errors"])

            res = self.client.put(
                reverse("minimum-checklist"), {"items": [" Drink water ", "10 push-ups", "drink water", ""]}, format="json"
            )
            self.assertEqual([i["title"] for i in res.data["checklist"]["items"]], ["Drink water", "10 push-ups"])

            state = self.client.post(reverse("minimum-day"), {"reason": "Travelling"}, format="json").data
            self.assertEqual((state["active"], state["reason"]), (True, "Travelling"))

            step = state["checklist"]["items"][0]
            self.client.post(reverse("routine-item-check", args=[step["id"]]), {"done": True}, format="json")
            self.assertEqual(self.state()["checklist"]["completed"], 1)

            # Editing keeps today's tick on an unchanged step.
            self.client.put(reverse("minimum-checklist"), {"items": ["Drink water", "Read 5 minutes"]}, format="json")
            self.assertEqual(self.state()["checklist"]["completed"], 1)

            self.assertFalse(self.client.delete(reverse("minimum-day")).data["active"])

    def test_minimum_checklist_is_never_the_morning_routine(self):
        with frozen_local_time(2026, 10, 5, 8):
            self.client.put(reverse("minimum-checklist"), {"items": ["Drink water"]}, format="json")
            self.assertEqual(self.client.get(reverse("routine-list")).data, [])
            self.assertIsNone(self.client.get(reverse("routine-today")).data["routine"])
            # A first morning routine still becomes the default.
            res = self.client.post(reverse("routine-list"), {"name": "Morning", "items": [{"title": "Shower"}]}, format="json")
            self.assertTrue(res.data["is_default"])
            self.assertEqual(self.client.get(reverse("routine-today")).data["routine"]["name"], "Morning")

