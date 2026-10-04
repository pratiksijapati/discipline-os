from datetime import date, timedelta

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time

from .models import Habit, HabitLog

# 2026-10-05 is a Monday. Default week start is Sunday (Oct 4).
MON = date(2026, 10, 5)


class HabitApiTests(AuthedAPITestCase):
    def create(self, **data):
        res = self.client.post(reverse("habit-list"), {"name": "Habit", **data}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def log(self, habit_id, value, day=None):
        payload = {"value": value, **({"date": day.isoformat()} if day else {})}
        return self.client.post(reverse("habit-log", args=[habit_id]), payload, format="json")

    def today(self):
        return {h["name"]: h for h in self.client.get(reverse("habit-today")).data["habits"]}

    def test_validation_rules(self):
        boolean = self.create(name="Workout", habit_type="boolean", target_value=5, unit="x")
        self.assertEqual((boolean["target_value"], boolean["unit"]), (1, ""))
        duration = self.create(name="Read", habit_type="duration", target_value=20)
        self.assertEqual(duration["unit"], "min")

        res = self.client.post(reverse("habit-list"), {"name": "Water", "habit_type": "quantity", "target_value": 8}, format="json")
        self.assertIn("unit", res.data["errors"])
        res = self.client.post(reverse("habit-list"), {"name": "X", "frequency": "selected_days"}, format="json")
        self.assertIn("days_of_week", res.data["errors"])
        res = self.client.post(reverse("habit-list"), {"name": "X", "frequency": "weekly_target"}, format="json")
        self.assertIn("weekly_target", res.data["errors"])

    def test_quantity_log_is_absolute_and_zero_clears(self):
        with frozen_local_time(2026, 10, 5):
            water = self.create(name="Water", habit_type="quantity", target_value=8, unit="glasses")
            card = self.log(water["id"], 6).data
            self.assertEqual((card["value"], card["completed"]), (6, False))
            card = self.log(water["id"], 8).data
            self.assertTrue(card["completed"])
            self.assertEqual(HabitLog.objects.filter(habit_id=water["id"]).count(), 1)
            self.log(water["id"], 0)
            self.assertFalse(HabitLog.objects.filter(habit_id=water["id"]).exists())

    def test_cannot_log_future(self):
        with frozen_local_time(2026, 10, 5):
            habit = self.create()
            res = self.log(habit["id"], 1, MON + timedelta(days=1))
        self.assertEqual(res.status_code, 400)

    def test_streak_counts_scheduled_days_and_today_does_not_break_it(self):
        with frozen_local_time(2026, 10, 5):
            habit = self.create(name="Workout", start_date="2026-09-28")
            for back in (1, 2, 3):
                self.log(habit["id"], 1, MON - timedelta(days=back))
            self.assertEqual(self.today()["Workout"]["streak"], 3)  # today not done yet: still 3
            self.log(habit["id"], 1)
            self.assertEqual(self.today()["Workout"]["streak"], 4)

    def test_selected_days_skip_unscheduled_days_in_streak(self):
        with frozen_local_time(2026, 10, 5):
            # Mon, Wed, Fri
            habit = self.create(name="Gym", frequency="selected_days", days_of_week=[0, 2, 4], start_date="2026-09-28")
            self.log(habit["id"], 1, date(2026, 10, 2))  # Fri
            self.log(habit["id"], 1, date(2026, 9, 30))  # Wed
            card = self.today()["Gym"]
        self.assertEqual(card["streak"], 2)
        self.assertTrue(card["due_today"])

    def test_weekly_target_stops_being_due_once_met(self):
        with frozen_local_time(2026, 10, 7):  # Wednesday; week started Sunday Oct 4
            habit = self.create(name="Run", frequency="weekly_target", weekly_target=2, start_date="2026-09-01")
            self.log(habit["id"], 1, date(2026, 10, 4))
            self.assertTrue(self.today()["Run"]["due_today"])
            self.log(habit["id"], 1, date(2026, 10, 6))
            card = self.today()["Run"]
        self.assertFalse(card["due_today"])
        self.assertEqual(card["week_count"], 2)
        self.assertIsNone(card["streak"])
        self.assertEqual(card["week"][0]["date"], "2026-10-04")

    def test_archived_habits_leave_today(self):
        with frozen_local_time(2026, 10, 5):
            habit = self.create(name="Old")
            self.client.patch(reverse("habit-detail", args=[habit["id"]]), {"is_active": False}, format="json")
            self.assertNotIn("Old", self.today())

    def test_reorder(self):
        a, b = self.create(name="A"), self.create(name="B")
        self.client.post(reverse("habit-reorder"), {"ids": [b["id"], a["id"]]}, format="json")
        self.assertEqual([h["name"] for h in self.client.get(reverse("habit-list")).data], ["B", "A"])

    def test_cannot_touch_other_users_habits(self):
        other = Habit.objects.create(user=self.other, name="Secret", start_date=MON)
        self.assertEqual(self.log(other.id, 1).status_code, 404)
        self.assertEqual(self.client.get(reverse("habit-detail", args=[other.id])).status_code, 404)
        self.client.post(reverse("habit-reorder"), {"ids": [other.id]}, format="json")
        other.refresh_from_db()
        self.assertEqual(other.position, 0)
        self.assertEqual(self.client.get(reverse("habit-today")).data["habits"], [])
