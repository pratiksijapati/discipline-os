from datetime import date

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time

from .models import DailyFocus, Task


class TaskApiTests(AuthedAPITestCase):
    def create(self, **data):
        res = self.client.post(reverse("task-list"), {"title": "Task", **data}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_create_defaults_points_from_priority(self):
        self.assertEqual(self.create(priority="critical")["points"], 5)
        self.assertEqual(self.create(priority="low")["points"], 1)
        self.assertEqual(self.create(priority="low", points=9)["points"], 9)

    def test_title_required_and_time_needs_date(self):
        res = self.client.post(reverse("task-list"), {"title": "  "}, format="json")
        self.assertIn("title", res.data["errors"])
        res = self.client.post(reverse("task-list"), {"title": "x", "due_time": "10:00"}, format="json")
        self.assertIn("due_time", res.data["errors"])

    def test_today_view_includes_overdue_open_only(self):
        with frozen_local_time(2026, 10, 5):
            self.create(title="today", due_date="2026-10-05")
            self.create(title="overdue", due_date="2026-10-01")
            done_old = self.create(title="old done", due_date="2026-10-01")
            self.client.patch(reverse("task-detail", args=[done_old["id"]]), {"status": "completed"}, format="json")
            self.create(title="later", due_date="2026-10-09")
            self.create(title="someday")

            titles = [t["title"] for t in self.client.get(reverse("task-list"), {"view": "today"}).data]
            self.assertEqual(sorted(titles), ["overdue", "today"])
            overdue = next(t for t in self.client.get(reverse("task-list"), {"view": "today"}).data if t["title"] == "overdue")
            self.assertTrue(overdue["is_overdue"])
            self.assertEqual([t["title"] for t in self.client.get(reverse("task-list"), {"view": "someday"}).data], ["someday"])
            self.assertEqual([t["title"] for t in self.client.get(reverse("task-list"), {"view": "upcoming"}).data], ["later"])

    def test_cannot_access_other_users_task(self):
        task = Task.objects.create(user=self.other, title="Private", due_date=date(2026, 10, 5))
        url = reverse("task-detail", args=[task.id])
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"status": "completed"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(self.client.get(reverse("task-list")).data, [])

    def test_user_field_cannot_be_injected(self):
        created = self.create(user=self.other.id)
        self.assertEqual(Task.objects.get(id=created["id"]).user, self.user)


class DailyFocusTests(AuthedAPITestCase):
    def today(self):
        return self.client.get(reverse("daily-focus-today")).data

    def test_set_edit_complete_and_clear_todays_focus(self):
        with frozen_local_time(2026, 10, 5, 8):
            self.assertIsNone(self.today())
            res = self.client.post(reverse("daily-focus-list"), {"title": "  Ship the dashboard API "}, format="json")
            self.assertEqual(res.status_code, 201, res.data)
            self.assertEqual((res.data["date"], res.data["title"]), ("2026-10-05", "Ship the dashboard API"))
            url = reverse("daily-focus-detail", args=[res.data["id"]])

            self.client.patch(url, {"title": "Ship the API"}, format="json")
            done = self.client.patch(url, {"completed": True}, format="json").data
            self.assertTrue(done["completed"])
            self.assertIsNotNone(done["completed_at"])
            self.assertEqual(self.today()["title"], "Ship the API")

            undone = self.client.patch(url, {"completed": False}, format="json").data
            self.assertIsNone(undone["completed_at"])

            self.assertEqual(self.client.delete(url).status_code, 204)
            self.assertIsNone(self.today())

    def test_only_one_focus_per_day(self):
        with frozen_local_time(2026, 10, 5, 8):
            self.client.post(reverse("daily-focus-list"), {"title": "First"}, format="json")
            res = self.client.post(reverse("daily-focus-list"), {"title": "Second"}, format="json")
            self.assertEqual(res.status_code, 400)
            self.assertIn("date", res.data["errors"])
            # Another day is fine.
            res = self.client.post(reverse("daily-focus-list"), {"title": "Tomorrow", "date": "2026-10-06"}, format="json")
            self.assertEqual(res.status_code, 201)
        self.assertEqual(DailyFocus.objects.filter(user=self.user).count(), 2)

    def test_blank_title_is_rejected(self):
        res = self.client.post(reverse("daily-focus-list"), {"title": "   "}, format="json")
        self.assertIn("title", res.data["errors"])

    def test_other_users_focus_is_invisible(self):
        theirs = DailyFocus.objects.create(user=self.other, date=date(2026, 10, 5), title="Theirs")
        url = reverse("daily-focus-detail", args=[theirs.id])
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"completed": True}, format="json").status_code, 404)
        with frozen_local_time(2026, 10, 5, 8):
            self.assertIsNone(self.today())

