from datetime import date, datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.urls import reverse

from core.testing import AuthedAPITestCase

from .models import Exercise, SessionExercise, WorkoutPlan, WorkoutSession

KTM = ZoneInfo("Asia/Kathmandu")


class Clock:
    """A controllable 'now' for timing pauses."""

    def __init__(self, start):
        self.now = start

    def __call__(self):
        return self.now

    def advance(self, **kwargs):
        self.now += timedelta(**kwargs)


class WorkoutApiTests(AuthedAPITestCase):
    def setUp(self):
        super().setUp()
        res = self.client.post(reverse("workout-plan-starter"))
        self.assertEqual(res.status_code, 201, res.data)
        self.push = next(p for p in res.data if p["name"] == "Push Day")

    def start(self, plan_id=None):
        return self.client.post(reverse("workout-list"), {"plan": plan_id or self.push["id"]}, format="json")

    def log_set(self, session, index=0, **values):
        row = session["exercises"][index]
        values = values or ({"duration_seconds": 60} if row["measure"] == "time" else {"reps": 10, "weight_kg": 20})
        res = self.client.post(
            reverse("workout-sets", args=[session["id"]]), {"session_exercise": row["id"], **values}, format="json"
        )
        return res

    def test_starter_is_idempotent_and_plan_has_targets(self):
        again = self.client.post(reverse("workout-plan-starter")).data
        self.assertEqual(len(again), 2)
        self.assertEqual(Exercise.objects.filter(user=self.user).count(), 9)
        rows = self.push["exercises"]
        self.assertEqual([r["exercise_name"] for r in rows][:2], ["Bench Press", "Push-ups"])
        self.assertEqual((rows[0]["target_sets"], rows[0]["target_reps"]), (3, 10))
        plank = rows[-1]
        self.assertEqual((plank["measure"], plank["target_duration_seconds"]), ("time", 60))

    def test_session_snapshots_plan_and_only_one_active(self):
        session = self.start().data
        self.assertEqual(len(session["exercises"]), 5)
        self.assertEqual(self.start().status_code, 409)

        # Editing the plan afterwards must not change the running session.
        bench = self.push["exercises"][0]["exercise"]
        self.client.patch(
            reverse("workout-plan-detail", args=[self.push["id"]]),
            {"exercises": [{"exercise": bench, "target_sets": 5, "target_reps": 5}]},
            format="json",
        )
        fresh = self.client.get(reverse("workout-detail", args=[session["id"]])).data
        self.assertEqual(len(fresh["exercises"]), 5)
        self.assertEqual(fresh["exercises"][0]["target_sets"], 3)

    def test_sets_number_themselves_and_validate_measure(self):
        session = self.start().data
        self.log_set(session, 0)
        res = self.log_set(session, 0, reps=8, weight_kg=22.5)
        sets = res.data["exercises"][0]["sets"]
        self.assertEqual([s["set_number"] for s in sets], [1, 2])
        self.assertEqual(sets[1]["weight_kg"], 22.5)
        self.assertEqual(self.log_set(session, 4, reps=10).status_code, 400)  # plank needs seconds
        self.assertEqual(self.log_set(session, 4).status_code, 201)
        self.assertEqual(self.log_set(session, 0, weight_kg=20).status_code, 400)  # reps required

    def test_pause_time_is_excluded_from_duration(self):
        clock = Clock(datetime(2026, 10, 5, 6, 15, tzinfo=KTM))
        with patch("django.utils.timezone.now", clock):
            session = self.start().data
            clock.advance(minutes=10)
            self.log_set(session)
            self.client.post(reverse("workout-pause", args=[session["id"]]))
            clock.advance(minutes=5)
            paused = self.client.get(reverse("workout-active")).data
            self.assertEqual(paused["status"], "paused")
            self.assertEqual(paused["active_seconds"], 600)
            self.client.post(reverse("workout-resume", args=[session["id"]]))
            clock.advance(minutes=20)
            done = self.client.post(reverse("workout-complete", args=[session["id"]])).data
        self.assertEqual(done["status"], "completed")
        self.assertEqual(done["duration_seconds"], 30 * 60)
        self.assertEqual(done["paused_seconds"], 5 * 60)
        self.assertEqual(done["totals"]["sets"], 1)
        self.assertEqual(done["totals"]["volume_kg"], 200.0)
        self.assertIsNone(self.client.get(reverse("workout-active")).data)

    def test_complete_needs_a_set_and_cancel_frees_slot(self):
        session = self.start().data
        res = self.client.post(reverse("workout-complete", args=[session["id"]]))
        self.assertEqual(res.status_code, 400)
        self.assertIn("at least one set", res.data["detail"])
        self.client.post(reverse("workout-cancel", args=[session["id"]]))
        self.assertEqual(self.start().status_code, 201)
        # Finished workouts can't be changed.
        self.assertEqual(self.log_set(session).status_code, 400)

    def test_history_and_exercise_progression(self):
        for weight in (20, 25):
            session = self.start().data
            self.log_set(session, 0, reps=10, weight_kg=weight)
            self.client.post(reverse("workout-complete", args=[session["id"]]))
        history = self.client.get(reverse("workout-list")).data["results"]
        self.assertEqual(len(history), 2)
        self.assertEqual((history[0]["exercise_count"], history[0]["set_count"]), (1, 1))
        bench = self.push["exercises"][0]["exercise"]
        progress = self.client.get(reverse("exercise-history", args=[bench])).data
        self.assertEqual([p["best_weight_kg"] for p in progress], [25.0, 20.0])

    def test_week_streak(self):
        self.client.patch(reverse("user-settings"), {"weekly_workout_target": 2}, format="json")
        plan = WorkoutPlan.objects.get(id=self.push["id"])
        # Weeks start Sunday. Two full weeks met (Sep 20, Sep 27), current week (Oct 4) has 1 so far.
        for day in (date(2026, 9, 21), date(2026, 9, 23), date(2026, 9, 28), date(2026, 10, 1), date(2026, 10, 5)):
            WorkoutSession.objects.create(
                user=self.user, plan=plan, name="Push Day", date=day, status="completed",
                started_at=datetime(day.year, day.month, day.day, 6, tzinfo=KTM), duration_seconds=1800,
            )
        with patch("core.time.timezone.now", return_value=datetime(2026, 10, 5, 12, tzinfo=KTM)):
            stats = self.client.get(reverse("workout-stats")).data
        self.assertEqual(stats["week"], {"count": 1, "target": 2})
        self.assertEqual(stats["week_streak"], 2)
        self.assertEqual(stats["best_week_streak"], 2)
        self.assertEqual(stats["month"]["count"], 2)
        self.assertEqual(stats["total_minutes"], 150)

    def test_exercise_in_use_cannot_be_deleted(self):
        bench = self.push["exercises"][0]["exercise"]
        res = self.client.delete(reverse("exercise-detail", args=[bench]))
        self.assertEqual(res.status_code, 400)
        self.assertIn("Archive", res.data["detail"])

    def test_ownership(self):
        foreign_ex = Exercise.objects.create(user=self.other, name="Secret lift")
        res = self.client.post(
            reverse("workout-plan-list"), {"name": "Sneaky", "exercises": [{"exercise": foreign_ex.id}]}, format="json"
        )
        self.assertEqual(res.status_code, 400)

        foreign_plan = WorkoutPlan.objects.create(user=self.other, name="Theirs")
        self.assertEqual(self.start(foreign_plan.id).status_code, 400)

        foreign_session = WorkoutSession.objects.create(
            user=self.other, name="Theirs", date=date(2026, 10, 5), started_at=datetime(2026, 10, 5, tzinfo=KTM)
        )
        foreign_row = SessionExercise.objects.create(session=foreign_session, exercise=foreign_ex)
        mine = self.start().data
        res = self.client.post(
            reverse("workout-sets", args=[mine["id"]]), {"session_exercise": foreign_row.id, "reps": 5}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.get(reverse("workout-detail", args=[foreign_session.id])).status_code, 404)
        self.assertEqual(self.client.post(reverse("workout-cancel", args=[foreign_session.id])).status_code, 404)

    def test_dashboard_shows_workout_state(self):
        self.client.patch(
            reverse("workout-plan-detail", args=[self.push["id"]]), {"days_of_week": [0]}, format="json"
        )
        with patch("core.time.timezone.now", return_value=datetime(2026, 10, 5, 6, tzinfo=KTM)):  # Monday
            data = self.client.get(reverse("dashboard-today")).data["workout"]
            self.assertEqual([p["name"] for p in data["planned"]], ["Push Day"])
            self.assertIsNone(data["active"])
            session = self.start().data
            self.assertEqual(self.client.get(reverse("dashboard-today")).data["workout"]["active"]["id"], session["id"])

    def test_deleting_account_removes_everything(self):
        session = self.start().data
        self.log_set(session)
        self.client.post(reverse("workout-complete", args=[session["id"]]))
        self.user.delete()  # must not be blocked by exercises used in plans/sessions
        self.assertFalse(Exercise.objects.filter(user_id=self.user.id).exists())
        self.assertFalse(WorkoutSession.objects.filter(user_id=self.user.id).exists())
