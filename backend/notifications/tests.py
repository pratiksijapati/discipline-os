from datetime import date, datetime, time
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from core.testing import AuthedAPITestCase
from goals.models import Goal
from habits.models import Habit
from planner.models import ScheduleItem
from reflections.models import DailyReflection
from tasks.models import Task

from .models import PushSubscription, SentReminder
from .reminders import due_reminders, run

KTM = ZoneInfo("Asia/Kathmandu")
MON = date(2026, 10, 5)
VAPID = {
    "VAPID_PUBLIC_KEY": "test-public-key",
    # Throwaway test key (not used anywhere real).
    "VAPID_PRIVATE_KEY": "x5yx0pXmTz0Pw5n6t7Wq4B7fJ2Gm5Y2ZcWl3t8nQm0E",
    "VAPID_SUBJECT": "mailto:test@example.com",
}


def ktm(hour, minute=0):
    return datetime(2026, 10, 5, hour, minute, tzinfo=KTM)


def keys(user, hour, minute=0):
    return [r.key.split(":")[0] for r in due_reminders(user, ktm(hour, minute))]


@override_settings(**VAPID)
class ReminderRuleTests(AuthedAPITestCase):
    def test_schedule_and_workout_lead_times(self):
        ScheduleItem.objects.create(
            user=self.user, title="Study", date=MON, occurrence_date=MON, start_time=time(20), reminder_minutes=15
        )
        ScheduleItem.objects.create(
            user=self.user, title="Workout", category="workout", date=MON, occurrence_date=MON, start_time=time(6, 15)
        )
        self.assertEqual(keys(self.user, 19, 44), [])
        study = due_reminders(self.user, ktm(19, 46))
        self.assertEqual(study[0].title, "Study starts in 15 minutes")
        workout = due_reminders(self.user, ktm(6, 5))[0]
        self.assertEqual((workout.title, workout.url), ("Workout starts in 10 minutes", "/workout"))

    def test_completed_items_dont_remind(self):
        ScheduleItem.objects.create(
            user=self.user, title="Study", date=MON, occurrence_date=MON, start_time=time(20), reminder_minutes=0, status="completed"
        )
        self.assertNotIn("schedule", keys(self.user, 20, 1))

    def test_tasks_habits_review_and_goals(self):
        Task.objects.create(user=self.user, title="Ship", due_date=MON, priority="high")
        Task.objects.create(user=self.user, title="Email", due_date=MON)
        Habit.objects.create(user=self.user, name="Read", start_date=date(2026, 10, 1))
        Goal.objects.create(user=self.user, title="React", target_value=30, start_date=date(2026, 9, 1), deadline=date(2026, 10, 6))

        tasks = due_reminders(self.user, ktm(18, 2))
        self.assertEqual(tasks[0].body, "You still have 1 important task remaining today.")
        self.assertEqual(due_reminders(self.user, ktm(20, 0))[0].title, "1 habit left today")
        self.assertEqual(due_reminders(self.user, ktm(22, 3))[0].url, "/reflection")
        goal = due_reminders(self.user, ktm(9, 1))[0]
        self.assertEqual(goal.title, "“React” is due tomorrow")

        DailyReflection.objects.create(user=self.user, date=MON, day_rating=4, completed_at=ktm(21))
        self.assertNotIn("review", keys(self.user, 22, 3))

    def test_wake_up_and_disabled_preferences(self):
        self.assertIn("wake", keys(self.user, 6, 0))
        self.client.patch(reverse("notification-preferences"), {"wake_up": False}, format="json")
        self.assertNotIn("wake", keys(self.user, 6, 0))
        self.client.patch(reverse("notification-preferences"), {"enabled": False}, format="json")
        Task.objects.create(user=self.user, title="Ship", due_date=MON, priority="high")
        self.assertEqual(keys(self.user, 18, 0), [])


@override_settings(**VAPID)
class SendingTests(AuthedAPITestCase):
    def subscribe(self, endpoint="https://push.example.com/abc"):
        return self.client.post(
            reverse("push-subscriptions"), {"endpoint": endpoint, "keys": {"p256dh": "key", "auth": "secret"}}, format="json"
        )

    def test_subscribe_config_and_unsubscribe(self):
        self.assertEqual(self.client.get(reverse("push-config")).data["devices"], 0)
        self.assertEqual(self.subscribe().status_code, 201)
        self.subscribe()  # same browser again: no duplicate
        config = self.client.get(reverse("push-config")).data
        self.assertTrue(config["configured"])
        self.assertEqual(config["devices"], 1)
        self.assertEqual(self.subscribe("http://insecure.example.com/x").status_code, 400)
        self.client.delete(reverse("push-subscriptions"), {"endpoint": "https://push.example.com/abc"}, format="json")
        self.assertFalse(PushSubscription.objects.exists())

    @patch("notifications.push.webpush")
    def test_run_sends_once_and_drops_dead_subscriptions(self, webpush):
        self.subscribe()
        Task.objects.create(user=self.user, title="Ship", due_date=MON, priority="high")
        sent_first = run(ktm(18, 1))
        sent_again = run(ktm(18, 2))
        self.assertEqual((sent_first, sent_again), (1, 0))
        self.assertEqual(webpush.call_count, 1)
        payload = webpush.call_args.kwargs["data"]
        self.assertIn("important task", payload)
        self.assertTrue(SentReminder.objects.filter(key="tasks:2026-10-05").exists())

        from pywebpush import WebPushException

        class Gone:
            status_code = 410

        webpush.side_effect = WebPushException("gone", response=Gone())
        self.client.post(reverse("push-test"))
        self.assertFalse(PushSubscription.objects.exists())

    @patch("notifications.push.webpush")
    def test_item_moved_later_today_gets_a_fresh_reminder(self, webpush):
        self.subscribe()
        item = ScheduleItem.objects.create(
            user=self.user, title="Study", date=MON, occurrence_date=MON, start_time=time(9), reminder_minutes=0
        )
        self.assertEqual(run(ktm(9, 1)), 1)
        item.start_time = time(11)  # moved to later today
        item.save()
        self.assertEqual(run(ktm(9, 2)), 0)
        self.assertEqual(run(ktm(11, 1)), 1)
        self.assertEqual(run(ktm(11, 2)), 0)

    @patch("notifications.push.webpush")
    def test_other_users_never_get_my_reminders(self, webpush):
        PushSubscription.objects.create(user=self.other, endpoint="https://push.example.com/other", p256dh="k", auth="a")
        Task.objects.create(user=self.user, title="Mine", due_date=MON, priority="high")
        run(ktm(18, 1))
        self.assertEqual(webpush.call_count, 0)  # I have no device; the other user has no due task

    def test_cron_endpoint_requires_secret(self):
        anonymous = APIClient()
        self.assertEqual(anonymous.post(reverse("reminders-run")).status_code, 404)
        with self.settings(REMINDER_CRON_SECRET="s3cret-value"):
            self.assertEqual(anonymous.post(reverse("reminders-run"), HTTP_X_CRON_SECRET="wrong").status_code, 404)
            res = anonymous.post(reverse("reminders-run"), HTTP_X_CRON_SECRET="s3cret-value")
        self.assertEqual(res.status_code, 200)
        self.assertIn("sent", res.data)
