"""
Wake-up challenges.

ChallengeType is the extension point: movement types share the camera motion
detector; MATH is verified on the server. Future types (steps, QR code…) add a
choice here plus their own verification in services.py.
"""

from django.conf import settings
from django.db import models

from core.choices import ChallengeType

MOVEMENT_TYPES = {ChallengeType.DANCE, ChallengeType.JUMPING_JACKS, ChallengeType.SQUATS}


class WakeChallengeSession(models.Model):
    class Method(models.TextChoices):
        CAMERA = "camera", "Camera (movement detected)"
        MANUAL = "manual", "Timer (no camera)"
        MATH = "math", "Math answers"

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        ABANDONED = "abandoned", "Abandoned"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wake_sessions")
    date = models.DateField()  # the user's local date
    challenge_type = models.CharField(max_length=20, choices=ChallengeType.choices)
    method = models.CharField(max_length=10, choices=Method.choices)
    target_seconds = models.PositiveSmallIntegerField(default=60)
    active_seconds = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.IN_PROGRESS)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    # Type-specific data, e.g. the math problems the server generated.
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "date", "status"])]

    def __str__(self):
        return f"{self.user} {self.date} {self.challenge_type} ({self.status})"
