from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import TimeStampedModel

ONE_TO_FIVE = [MinValueValidator(1), MaxValueValidator(5)]


class DailyReflection(TimeStampedModel):
    """
    The Night Review for one day. Saved as a draft while typing; "Complete Day"
    sets completed_at and freezes a snapshot of the day's numbers in `stats`,
    so the summary stays the same when viewed later.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reflections")
    date = models.DateField()
    day_rating = models.PositiveSmallIntegerField(null=True, blank=True, validators=ONE_TO_FIVE)  # 😞 … 🔥
    went_well = models.TextField(blank=True)
    improve = models.TextField(blank=True)
    grateful = models.TextField(blank=True)
    energy = models.PositiveSmallIntegerField(null=True, blank=True, validators=ONE_TO_FIVE)
    mood = models.PositiveSmallIntegerField(null=True, blank=True, validators=ONE_TO_FIVE)
    completed_at = models.DateTimeField(null=True, blank=True)
    stats = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="one_reflection_per_day")]

    def __str__(self):
        return f"{self.user} {self.date}"

    @property
    def is_completed(self) -> bool:
        return self.completed_at is not None
