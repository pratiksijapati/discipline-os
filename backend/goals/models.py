from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.choices import Priority
from core.models import TimeStampedModel


class Goal(TimeStampedModel):
    class Category(models.TextChoices):
        FITNESS = "fitness", "Fitness"
        STUDY = "study", "Study"
        CAREER = "career", "Career"
        MONEY = "money", "Money"
        READING = "reading", "Reading"
        CODING = "coding", "Coding"
        PROJECTS = "projects", "Personal projects"
        MINDSET = "mindset", "Mindset"
        RELATIONSHIPS = "relationships", "Relationships"
        OTHER = "other", "Other"

    class Measure(models.TextChoices):
        BOOLEAN = "boolean", "Done / not done"
        NUMBER = "number", "Number"
        CURRENCY = "currency", "Money"
        DURATION = "duration", "Time (hours)"
        COUNT = "count", "Count"
        PERCENTAGE = "percentage", "Percentage"

    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        PAUSED = "paused", "Paused"

    OPEN_STATUSES = (Status.NOT_STARTED, Status.IN_PROGRESS)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goals")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    measure = models.CharField(max_length=12, choices=Measure.choices, default=Measure.NUMBER)
    target_value = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    unit = models.CharField(max_length=20, blank=True)
    start_date = models.DateField()
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NOT_STARTED)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    # The one goal pinned to the Today page.
    is_main = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-is_main", "deadline", "id"]
        constraints = [models.UniqueConstraint(fields=["user"], condition=Q(is_main=True), name="one_main_goal_per_user")]
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self):
        return self.title

    @property
    def progress_pct(self) -> int:
        if self.target_value <= 0:
            return 0
        return max(0, min(100, int(self.current_value * 100 / self.target_value)))


class GoalProgress(models.Model):
    """One progress entry. `delta` can be negative (e.g. money withdrawn, or a correction)."""

    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name="progress")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goal_progress")
    date = models.DateField()
    delta = models.DecimalField(max_digits=12, decimal_places=2)
    value_after = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "date"])]
