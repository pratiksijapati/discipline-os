"""
Daily schedule.

ScheduleTemplate = a recurring rule ("Workout, Mon/Tue/Thu/Sat, 6:15").
ScheduleItem     = one concrete entry on one day. One-off items have no template.

Occurrences of a template are created lazily the first time a day is viewed
(see services.ensure_occurrences). The unique (template, occurrence_date)
constraint makes duplicates impossible, and `occurrence_date` stays fixed even
when an occurrence is rescheduled, so the rule never re-creates it.
"""

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.choices import Priority
from core.models import TimeStampedModel


class Category(models.TextChoices):
    MORNING = "morning", "Morning"
    WORKOUT = "workout", "Workout"
    WORK = "work", "Work"
    STUDY = "study", "Study"
    PERSONAL = "personal", "Personal"
    MEAL = "meal", "Meal"
    REST = "rest", "Rest"
    GROWTH = "growth", "Growth"
    NIGHT = "night", "Night"


class ScheduleFields(TimeStampedModel):
    """Fields shared by a template and the items it produces."""

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.PERSONAL)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    reminder_minutes = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Remind this many minutes before the start. Empty = no reminder."
    )
    notes = models.TextField(blank=True)

    COPIED_FIELDS = (
        "title",
        "description",
        "category",
        "priority",
        "start_time",
        "end_time",
        "reminder_minutes",
        "notes",
    )

    class Meta:
        abstract = True


class ScheduleTemplate(ScheduleFields):
    class Repeat(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKDAYS = "weekdays", "Weekdays (Mon–Fri)"
        WEEKENDS = "weekends", "Weekends (Sat–Sun)"
        SELECTED_DAYS = "selected_days", "Selected days"
        WEEKLY = "weekly", "Weekly"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="schedule_templates")
    repeat = models.CharField(max_length=20, choices=Repeat.choices, default=Repeat.DAILY)
    # Python weekday numbers: Monday=0 … Sunday=6. Used when repeat = selected_days.
    days_of_week = models.JSONField(default=list, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["start_time", "id"]
        indexes = [models.Index(fields=["user", "is_active"])]

    def __str__(self):
        return f"{self.title} ({self.get_repeat_display()})"

    def occurs_on(self, day) -> bool:
        if day < self.start_date or (self.end_date and day > self.end_date):
            return False
        weekday = day.weekday()
        if self.repeat == self.Repeat.DAILY:
            return True
        if self.repeat == self.Repeat.WEEKDAYS:
            return weekday < 5
        if self.repeat == self.Repeat.WEEKENDS:
            return weekday >= 5
        if self.repeat == self.Repeat.SELECTED_DAYS:
            return weekday in (self.days_of_week or [])
        if self.repeat == self.Repeat.WEEKLY:
            return weekday == self.start_date.weekday()
        return False


class ScheduleItem(ScheduleFields):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        # "missed" is never stored; it is derived when displayed (see status.py).

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="schedule_items")
    template = models.ForeignKey(
        ScheduleTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="occurrences"
    )
    date = models.DateField()
    # The day the template rule produced this item. Never changes, even if rescheduled.
    occurrence_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Edited individually → template changes no longer overwrite it.
    is_customized = models.BooleanField(default=False)
    # A deleted occurrence of a recurring item stays as a hidden marker so it isn't re-created.
    is_removed = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "start_time", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["template", "occurrence_date"],
                condition=Q(template__isnull=False),
                name="unique_occurrence_per_template_day",
            )
        ]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"{self.date} {self.start_time:%H:%M} {self.title}"


class Routine(TimeStampedModel):
    """
    An ordered checklist. "morning" routines are the morning routine (one is the default);
    the single "minimum" routine is the short checklist used on a Minimum Day.
    """

    class Kind(models.TextChoices):
        MORNING = "morning", "Morning routine"
        MINIMUM = "minimum", "Minimum day"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="routines")
    name = models.CharField(max_length=80)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.MORNING)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_default", "id"]
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=Q(is_default=True), name="one_default_routine_per_user"),
            models.UniqueConstraint(fields=["user"], condition=Q(kind="minimum"), name="one_minimum_checklist_per_user"),
        ]

    def __str__(self):
        return self.name


class RoutineItem(TimeStampedModel):
    routine = models.ForeignKey(Routine, on_delete=models.CASCADE, related_name="items")
    title = models.CharField(max_length=120)
    position = models.PositiveIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)
    duration_minutes = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self):
        return self.title


class RoutineLog(models.Model):
    """A routine item ticked off on a given day."""

    item = models.ForeignKey(RoutineItem, on_delete=models.CASCADE, related_name="logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="routine_logs")
    date = models.DateField()
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["item", "date"], name="unique_routine_log_per_day")]
        indexes = [models.Index(fields=["user", "date"])]


class MinimumDay(models.Model):
    """
    "Today I'm doing the minimum." On these days the short Minimum Day checklist stands in
    for the morning routine. It is not a free pass: everything else still counts as usual.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="minimum_days")
    date = models.DateField()
    reason = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="one_minimum_day_per_user_per_day")]

    def __str__(self):
        return f"{self.date} (minimum day)"

