from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import TimeStampedModel


class Habit(TimeStampedModel):
    class Type(models.TextChoices):
        BOOLEAN = "boolean", "Done / not done"
        QUANTITY = "quantity", "Count"
        DURATION = "duration", "Duration"

    class Frequency(models.TextChoices):
        DAILY = "daily", "Every day"
        SELECTED_DAYS = "selected_days", "Selected days"
        WEEKLY_TARGET = "weekly_target", "Times per week"

    class Category(models.TextChoices):
        HEALTH = "health", "Health"
        FITNESS = "fitness", "Fitness"
        MIND = "mind", "Mind"
        LEARNING = "learning", "Learning"
        PRODUCTIVITY = "productivity", "Productivity"
        SLEEP = "sleep", "Sleep"
        SOCIAL = "social", "Social"
        OTHER = "other", "Other"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="habits")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.HEALTH)
    habit_type = models.CharField(max_length=10, choices=Type.choices, default=Type.BOOLEAN)
    # Boolean habits always have target 1. Duration values are in minutes.
    target_value = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit = models.CharField(max_length=30, blank=True)
    frequency = models.CharField(max_length=20, choices=Frequency.choices, default=Frequency.DAILY)
    days_of_week = models.JSONField(default=list, blank=True)  # Mon=0 … Sun=6, for selected_days
    weekly_target = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(7)]
    )
    points = models.PositiveSmallIntegerField(default=1)
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        return self.name

    def is_scheduled_on(self, day) -> bool:
        """Whether the habit applies on this day (weekly-target habits apply every day)."""
        if day < self.start_date:
            return False
        if self.frequency == self.Frequency.SELECTED_DAYS:
            return day.weekday() in (self.days_of_week or [])
        return True

    def is_met(self, value: int) -> bool:
        return value >= self.target_value


class HabitLog(TimeStampedModel):
    """How much of a habit was done on one day. One row per habit per day."""

    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="habit_logs")
    date = models.DateField()
    value = models.PositiveIntegerField(default=0)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["habit", "date"], name="unique_habit_log_per_day")]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"{self.habit} {self.date}: {self.value}"
