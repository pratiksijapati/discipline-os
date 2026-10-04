from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase
from planner.models import Routine, RoutineItem, RoutineLog

from .models import WakeChallengeSession

KTM = ZoneInfo("Asia/Kathmandu")


class Clock:
    def __init__(self, start):
        self.now = start

    def __call__(self):
        return self.now

    def advance(self, **kwargs):
        self.now += timedelta(**kwargs)


class WakeChallengeTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        self.clock = Clock(datetime(2026, 10, 5, 6, 2, tzinfo=KTM))
        patcher = patch("django.utils.timezone.now", self.clock)
        patcher.start()
        self.addCleanup(patcher.stop)

    def start(self, **data):
        res = self.client.post(reverse("wake-session-list"), data, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def complete(self, session_id, **data):
        return self.client.post(reverse("wake-session-complete", args=[session_id]), data, format="json")

    def test_today_reports_setup(self):
        data = self.client.get(reverse("wake-today")).data
        self.assertEqual(data["challenge"], {"enabled": True, "type": "dance", "seconds": 60})
        self.assertEqual((data["wake_time"], data["deadline"]), ("06:00", "06:15"))
        self.assertIsNone(data["completed"])

    def test_movement_needs_real_time_and_ticks_routine(self):
        routine = Routine.objects.create(user=self.user, name="Morning", is_default=True)
        wake = RoutineItem.objects.create(routine=routine, title="Wake up", position=1)
        dance = RoutineItem.objects.create(routine=routine, title="Dance challenge", position=2)
        water = RoutineItem.objects.create(routine=routine, title="Drink water", position=3)

        session = self.start(method="camera")
        self.assertEqual((session["challenge_type"], session["target_seconds"]), ("dance", 60))

        self.clock.advance(seconds=20)
        res = self.complete(session["id"], active_seconds=60)
        self.assertEqual(res.status_code, 400)  # can't finish 60 s in 20 s

        self.clock.advance(seconds=50)
        self.assertEqual(self.complete(session["id"], active_seconds=30).status_code, 400)  # not enough movement
        res = self.complete(session["id"], active_seconds=61)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "completed")
        self.assertIn("current", res.data["streak"])

        ticked = set(RoutineLog.objects.filter(date="2026-10-05").values_list("item_id", flat=True))
        self.assertEqual(ticked, {wake.id, dance.id})
        self.assertNotIn(water.id, ticked)
        self.assertEqual(self.complete(session["id"], active_seconds=61).status_code, 400)  # already done

    def test_math_is_checked_on_the_server_and_answers_never_leak(self):
        session = self.start(challenge_type="math")
        self.assertEqual(session["method"], "math")
        self.assertEqual(len(session["problems"]), 3)
        self.assertNotIn("answer", str(session))

        stored = WakeChallengeSession.objects.get(id=session["id"]).details["problems"]
        wrong = [p["answer"] + 1 for p in stored]
        res = self.complete(session["id"], answers=wrong)
        self.assertEqual(res.status_code, 400)
        self.assertIn("answers", res.data["errors"])
        self.assertEqual(self.complete(session["id"], answers=[p["answer"] for p in stored]).status_code, 200)

    def test_challenge_counts_as_on_time_wake_in_the_score(self):
        session = self.start(method="manual")
        self.clock.advance(seconds=61)
        self.complete(session["id"], active_seconds=60)
        with patch("core.time.timezone.now", self.clock):
            breakdown = self.client.get(reverse("discipline-today")).data["breakdown"]
        wake = next(c for c in breakdown if c["key"] == "wake_up")
        self.assertTrue(wake["applicable"])
        self.assertEqual(wake["ratio"], 1.0)
        self.assertIn("6:03 AM", wake["detail"])

    def test_new_account_is_not_scored_on_the_challenge_until_used(self):
        breakdown = self.client.get(reverse("discipline-today")).data["breakdown"]
        wake = next(c for c in breakdown if c["key"] == "wake_up")
        self.assertFalse(wake["applicable"])

    def test_starting_again_abandons_the_previous_attempt(self):
        first = self.start()
        self.start()
        self.assertEqual(WakeChallengeSession.objects.get(id=first["id"]).status, "abandoned")

    def test_ownership(self):
        theirs = WakeChallengeSession.objects.create(
            user=self.other, date="2026-10-05", challenge_type="dance", method="camera", started_at=self.clock.now
        )
        self.assertEqual(self.complete(theirs.id, active_seconds=60).status_code, 404)
        self.assertEqual(self.client.get(reverse("wake-session-detail", args=[theirs.id])).status_code, 404)
