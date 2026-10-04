from django.conf import settings
from django.db import models


class DailyScore(models.Model):
    """
    The discipline score for one day.

    Today's row is recalculated live; once a day is over its row is marked final
    and never changes, so history and streaks stay stable even if settings change.
    `score` is null for days where nothing was tracked.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_scores")
    date = models.DateField()
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    breakdown = models.JSONField(default=list)
    is_final = models.BooleanField(default=False)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="one_score_per_day")]

    def __str__(self):
        return f"{self.user} {self.date}: {self.score}"

    def component(self, key: str) -> dict | None:
        return next((c for c in self.breakdown if c["key"] == key), None)
