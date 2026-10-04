from datetime import time

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class PushSubscription(TimeStampedModel):
    """One browser/device that agreed to receive push notifications."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=1000, unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    user_agent = models.CharField(max_length=300, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user} · {self.user_agent[:40]}"

    def as_subscription_info(self) -> dict:
        return {"endpoint": self.endpoint, "keys": {"p256dh": self.p256dh, "auth": self.auth}}


class NotificationPreference(TimeStampedModel):
    """Which reminders a user wants, and when (local wall-clock times)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preference")
    enabled = models.BooleanField(default=True)

    schedule_reminders = models.BooleanField(default=True)  # items with a reminder set
    workout_reminder = models.BooleanField(default=True)  # workout items, even without a reminder set
    workout_lead_minutes = models.PositiveSmallIntegerField(default=10)
    wake_up = models.BooleanField(default=True)  # at your wake-up time (Settings → Discipline score)
    tasks = models.BooleanField(default=True)
    tasks_time = models.TimeField(default=time(18, 0))
    habits = models.BooleanField(default=True)
    habits_time = models.TimeField(default=time(20, 0))
    night_review = models.BooleanField(default=True)
    night_review_time = models.TimeField(default=time(22, 0))
    goal_deadlines = models.BooleanField(default=True)
    goal_deadlines_time = models.TimeField(default=time(9, 0))

    def __str__(self):
        return f"Notification preferences for {self.user}"

    @classmethod
    def for_user(cls, user) -> "NotificationPreference":
        obj, _ = cls.objects.get_or_create(user=user)
        return obj


class SentReminder(models.Model):
    """Remembers what was sent, so the every-minute job never sends the same reminder twice."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_reminders")
    key = models.CharField(max_length=120)  # e.g. "schedule:42:2026-10-05"
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="unique_reminder_per_key")]
        indexes = [models.Index(fields=["sent_at"])]
