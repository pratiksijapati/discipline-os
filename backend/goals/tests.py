from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase

from .models import Goal

NOW = datetime(2026, 10, 5, 9, tzinfo=ZoneInfo("Asia/Kathmandu"))


class GoalApiTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        patcher = patch("core.time.timezone.now", return_value=NOW)
        patcher.start()
        self.addCleanup(patcher.stop)

    def create(self, **data):
        res = self.client.post(reverse("goal-list"), {"title": "Goal", **data}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def log(self, goal_id, amount, mode="add"):
        return self.client.post(reverse("goal-progress", args=[goal_id]), {"amount": amount, "mode": mode}, format="json")

    def test_measure_defaults_and_validation(self):
        boolean = self.create(title="Launch site", measure="boolean", target_value=50)
        self.assertEqual((boolean["target_value"], boolean["unit"]), (1.0, ""))
        pct = self.create(title="Course", measure="percentage")
        self.assertEqual((pct["target_value"], pct["unit"]), (100.0, "%"))
        money = self.create(title="Save", measure="currency", target_value=10000)
        self.assertEqual(money["unit"], "NPR")
        hours = self.create(title="Learn React", measure="duration", target_value=30)
        self.assertEqual(hours["unit"], "h")

        res = self.client.post(reverse("goal-list"), {"title": "X", "measure": "count", "target_value": 0}, format="json")
        self.assertIn("target_value", res.data["errors"])
        res = self.client.post(
            reverse("goal-list"),
            {"title": "X", "target_value": 5, "start_date": "2026-10-05", "deadline": "2026-10-01"},
            format="json",
        )
        self.assertIn("deadline", res.data["errors"])

    def test_progress_moves_status_and_completes(self):
        goal = self.create(title="Learn React", measure="duration", target_value=30, deadline="2026-10-23")
        self.assertEqual((goal["status"], goal["days_left"]), ("not_started", 18))
        goal = self.log(goal["id"], "12").data
        self.assertEqual((goal["current_value"], goal["status"], goal["progress_pct"]), (12.0, "in_progress", 40))
        goal = self.log(goal["id"], "20").data
        self.assertEqual((goal["status"], goal["progress_pct"]), ("completed", 100))
        self.assertIsNotNone(goal["completed_at"])
        self.assertIsNone(goal["days_left"])

    def test_set_mode_and_undo(self):
        goal = self.create(title="Save", measure="currency", target_value=10000)
        self.log(goal["id"], "4500")
        self.log(goal["id"], "-500")
        goal = self.log(goal["id"], "6000", mode="set").data
        self.assertEqual(goal["current_value"], 6000.0)

        history = self.client.get(reverse("goal-progress", args=[goal["id"]])).data
        self.assertEqual([h["delta"] for h in history], [2000.0, -500.0, 4500.0])
        goal = self.client.delete(reverse("goal-progress-detail", args=[history[0]["id"]])).data
        self.assertEqual(goal["current_value"], 4000.0)

    def test_current_value_only_changes_through_progress(self):
        goal = self.create(title="Books", measure="count", target_value=12, current_value=3)
        self.assertEqual((goal["current_value"], goal["status"]), (3.0, "in_progress"))
        res = self.client.patch(reverse("goal-detail", args=[goal["id"]]), {"current_value": 9}, format="json")
        self.assertIn("current_value", res.data["errors"])

    def test_paused_goal_stays_paused(self):
        goal = self.create(title="Run", measure="count", target_value=20)
        self.client.patch(reverse("goal-detail", args=[goal["id"]]), {"status": "paused"}, format="json")
        goal = self.log(goal["id"], "5").data
        self.assertEqual(goal["status"], "paused")
        goal = self.client.patch(reverse("goal-detail", args=[goal["id"]]), {"status": "in_progress"}, format="json").data
        self.assertEqual(goal["status"], "in_progress")
        res = self.client.patch(reverse("goal-detail", args=[goal["id"]]), {"status": "completed"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_main_goal_is_unique_and_shows_on_dashboard(self):
        first = self.create(title="First", target_value=5)
        second = self.create(title="Second", target_value=5)
        self.assertTrue(first["is_main"])
        self.assertFalse(second["is_main"])
        self.client.post(reverse("goal-main", args=[second["id"]]))
        self.assertEqual(Goal.objects.get(is_main=True).title, "Second")
        self.assertEqual(self.client.get(reverse("dashboard-today")).data["main_goal"]["title"], "Second")
        self.client.post(reverse("goal-main", args=[second["id"]]))  # unpin
        self.assertIsNone(self.client.get(reverse("dashboard-today")).data["main_goal"])

    def test_status_filter(self):
        done = self.create(title="Done", measure="boolean")
        self.log(done["id"], "1", mode="set")
        self.create(title="Open", target_value=5)
        active = [g["title"] for g in self.client.get(reverse("goal-list"), {"status": "active"}).data]
        completed = [g["title"] for g in self.client.get(reverse("goal-list"), {"status": "completed"}).data]
        self.assertEqual((active, completed), (["Open"], ["Done"]))

    def test_ownership(self):
        theirs = Goal.objects.create(user=self.other, title="Secret", target_value=5, start_date="2026-10-01")
        self.assertEqual(self.log(theirs.id, "1").status_code, 404)
        self.assertEqual(self.client.get(reverse("goal-detail", args=[theirs.id])).status_code, 404)
        self.assertEqual(self.client.post(reverse("goal-main", args=[theirs.id])).status_code, 404)
        entry = theirs.progress.create(user=self.other, date="2026-10-05", delta=1, value_after=1)
        self.assertEqual(self.client.delete(reverse("goal-progress-detail", args=[entry.id])).status_code, 404)
        self.assertEqual(self.client.get(reverse("goal-list")).data, [])
