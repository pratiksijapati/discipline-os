from datetime import date

from django.urls import reverse

from core.testing import AuthedAPITestCase, frozen_local_time

from .models import Task


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
