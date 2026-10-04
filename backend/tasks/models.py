from django.conf import settings
from django.db import models

from core.choices import Priority
from core.models import TimeStampedModel


class Task(TimeStampedModel):
    """A to-do. Unlike a schedule item it has no fixed time slot — just an optional due date."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    class Category(models.TextChoices):
        WORK = "work", "Work"
        STUDY = "study", "Study"
        PERSONAL = "personal", "Personal"
        HEALTH = "health", "Health"
        HOME = "home", "Home"
        GROWTH = "growth", "Growth"
        FINANCE = "finance", "Finance"
        OTHER = "other", "Other"

    OPEN_STATUSES = (Status.PENDING, Status.IN_PROGRESS)
    DEFAULT_POINTS = {Priority.LOW: 1, Priority.MEDIUM: 2, Priority.HIGH: 3, Priority.CRITICAL: 5}

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    due_time = models.TimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.PERSONAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    points = models.PositiveSmallIntegerField(default=2)
    notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["due_date", "due_time", "id"]
        indexes = [
            models.Index(fields=["user", "due_date"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return self.title

    @property
    def is_open(self) -> bool:
        return self.status in self.OPEN_STATUSES
