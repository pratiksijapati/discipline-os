from datetime import time

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time
from planner.models import ScheduleTemplate
from tasks.models import Task


class TodayDashboardTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        start = "2026-10-01"
        for title, start_t, end_t in [
            ("Wake up", time(6, 0), time(6, 5)),
            ("Workout", time(6, 15), time(7, 0)),
            ("Breakfast", time(7, 15), time(7, 45)),
            ("Work", time(9, 0), time(17, 0)),
        ]:
            ScheduleTemplate.objects.create(
                user=self.user, title=title, start_time=start_t, end_time=end_t, repeat="daily", start_date=start
            )
        # Another user's data must never leak into my dashboard.
        ScheduleTemplate.objects.create(
            user=self.other, title="Not mine", start_time=time(6, 30), repeat="daily", start_date=start
        )

    def get(self):
        res = self.client.get(reverse("dashboard-today"))
        self.assertEqual(res.status_code, 200, res.data)
        return res.data

    def test_now_and_next(self):
        with frozen_local_time(2026, 10, 5, 6, 30):
            data = self.get()
        self.assertEqual(data["date"], "2026-10-05")
        self.assertEqual(data["current"]["title"], "Workout")
        self.assertEqual(data["next"]["title"], "Breakfast")
        self.assertEqual([i["title"] for i in data["schedule"]], ["Wake up", "Workout", "Breakfast", "Work"])
        self.assertEqual(data["schedule"][0]["display_status"], "missed")

    def test_in_progress_item_wins_as_current(self):
        with frozen_local_time(2026, 10, 5, 7, 20):
            data = self.get()
            wake = data["schedule"][0]
            self.client.patch(reverse("schedule-item-detail", args=[wake["id"]]), {"status": "in_progress"}, format="json")
            self.assertEqual(self.get()["current"]["title"], "Wake up")

    def test_summary_and_tasks(self):
        Task.objects.create(user=self.user, title="Ship feature", due_date="2026-10-05", priority="high")
        Task.objects.create(user=self.user, title="Old", due_date="2026-10-02")
        Task.objects.create(user=self.other, title="Not mine", due_date="2026-10-05")
        with frozen_local_time(2026, 10, 5, 12):
            first = self.get()
            self.client.patch(
                reverse("schedule-item-detail", args=[first["schedule"][1]["id"]]), {"status": "completed"}, format="json"
            )
            data = self.get()
        self.assertEqual([t["title"] for t in data["tasks"]], ["Old", "Ship feature"])
        self.assertEqual(data["summary"]["schedule"], {"completed": 1, "total": 4, "missed": 2})
        self.assertEqual(data["summary"]["tasks"], {"completed": 0, "total": 1, "overdue": 1})
        self.assertEqual(data["summary"]["progress"], 20)  # 1 of 5
        self.assertEqual(data["current"]["title"], "Work")
        self.assertIsNone(data["next"])

    def test_evening_has_no_current(self):
        with frozen_local_time(2026, 10, 5, 21):
            data = self.get()
        self.assertIsNone(data["current"])
        self.assertIsNone(data["next"])


class DashboardHabitsAndRoutineTests(AuthedAPITestCase):
    def test_habits_and_routine_count_toward_progress(self):
        from habits.models import Habit, HabitLog
        from planner.models import Routine, RoutineItem, RoutineLog

        with frozen_local_time(2026, 10, 5, 8):
            water = Habit.objects.create(
                user=self.user, name="Water", habit_type="quantity", target_value=8, unit="glasses", start_date="2026-10-01"
            )
            Habit.objects.create(user=self.user, name="Read", start_date="2026-10-01")
            HabitLog.objects.create(habit=water, user=self.user, date="2026-10-05", value=8)
            routine = Routine.objects.create(user=self.user, name="Morning", is_default=True)
            steps = [RoutineItem.objects.create(routine=routine, title=f"Step {i}", position=i) for i in range(4)]
            RoutineLog.objects.create(item=steps[0], user=self.user, date="2026-10-05")
            RoutineLog.objects.create(item=steps[1], user=self.user, date="2026-10-05")
            data = self.client.get(reverse("dashboard-today")).data

        self.assertEqual([h["name"] for h in data["habits"]], ["Water", "Read"])
        self.assertEqual(data["summary"]["habits"], {"completed": 1, "total": 2})
        self.assertEqual(data["summary"]["routine"], {"completed": 2, "total": 4})
        self.assertEqual((data["routine"]["completed"], data["routine"]["total"]), (2, 4))
        # 1 habit + half the routine, out of 2 habits + 1 routine = 1.5 / 3
        self.assertEqual(data["summary"]["progress"], 50)
