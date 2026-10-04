"""
Workouts.

Exercise         ??? the user's exercise library.
WorkoutPlan      ??? e.g. "Push Day", with PlanExercise rows (targets, order).
WorkoutSession   ??? one workout actually done (or in progress).
SessionExercise  ??? a COPY of each plan exercise taken when the session starts,
                   so editing a plan later never rewrites workout history.
WorkoutSet       ??? one logged set (reps ?? weight, or seconds for timed exercises).
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from core.models import TimeStampedModel


class Measure(models.TextChoices):
    REPS = "reps", "Reps"
    TIME = "time", "Time"


class Exercise(TimeStampedModel):
    class Category(models.TextChoices):
        STRENGTH = "strength", "Strength"
        BODYWEIGHT = "bodyweight", "Bodyweight"
        CARDIO = "cardio", "Cardio"
        CORE = "core", "Core"
        MOBILITY = "mobility", "Mobility"
        OTHER = "other", "Other"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.STRENGTH)
    measure = models.CharField(max_length=10, choices=Measure.choices, default=Measure.REPS)
    instructions = models.TextField(blank=True)
    default_sets = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(20)])
    default_reps = models.PositiveSmallIntegerField(null=True, blank=True)
    default_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    default_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(Lower("name"), "user", name="unique_exercise_name_per_user")]

    def __str__(self):
        return self.name


class WorkoutPlan(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workout_plans")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    days_of_week = models.JSONField(default=list, blank=True)  # Mon=0 ??? Sun=6
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class ExerciseTargets(models.Model):
    """Target fields shared by plan rows and session rows."""

    position = models.PositiveSmallIntegerField(default=0)
    target_sets = models.PositiveSmallIntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(20)])
    target_reps = models.PositiveSmallIntegerField(null=True, blank=True)
    target_duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    target_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    TARGET_FIELDS = ("position", "target_sets", "target_reps", "target_duration_seconds", "target_weight_kg")

    class Meta:
        abstract = True
        ordering = ["position", "id"]


class PlanExercise(ExerciseTargets):
    plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name="exercises")
    exercise = models.ForeignKey(Exercise, on_delete=models.RESTRICT, related_name="plan_rows")
    rest_seconds = models.PositiveSmallIntegerField(default=60)

    class Meta(ExerciseTargets.Meta):
        pass


class WorkoutSession(TimeStampedModel):
    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In progress"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    ACTIVE_STATUSES = (Status.IN_PROGRESS, Status.PAUSED)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workout_sessions")
    plan = models.ForeignKey(WorkoutPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name="sessions")
    name = models.CharField(max_length=100)  # copied from the plan at start
    date = models.DateField()  # the user's local date when it started
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    paused_seconds = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)  # active time, set on completion
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(status__in=["in_progress", "paused"]),
                name="one_active_workout_per_user",
            )
        ]
        indexes = [models.Index(fields=["user", "status", "date"])]

    def __str__(self):
        return f"{self.name} {self.date}"

    @property
    def is_active(self) -> bool:
        return self.status in self.ACTIVE_STATUSES


class SessionExercise(ExerciseTargets):
    session = models.ForeignKey(WorkoutSession, on_delete=models.CASCADE, related_name="exercises")
    exercise = models.ForeignKey(Exercise, on_delete=models.RESTRICT, related_name="session_rows")

    class Meta(ExerciseTargets.Meta):
        pass


class WorkoutSet(models.Model):
    session_exercise = models.ForeignKey(SessionExercise, on_delete=models.CASCADE, related_name="sets")
    set_number = models.PositiveSmallIntegerField()
    reps = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["set_number"]
        constraints = [
            models.UniqueConstraint(fields=["session_exercise", "set_number"], name="unique_set_number_per_exercise")
        ]
