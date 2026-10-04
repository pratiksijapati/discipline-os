from datetime import date, time, timedelta

from django.utils import timezone

from core.time import user_now
from discipline.services import build_day, day_counts
from planner.models import Category, ScheduleItem

from .models import DailyReflection

# Reviewing shortly after midnight still counts as reviewing the day that just ended.
LATE_NIGHT_CUTOFF = time(4, 0)


def review_date(user) -> date:
    now = user_now(user)
    if now.time() < LATE_NIGHT_CUTOFF:
        yesterday = now.date() - timedelta(days=1)
        done = DailyReflection.objects.filter(user=user, date=yesterday, completed_at__isnull=False).exists()
        if not done:
            return yesterday
    return now.date()


def live_day_stats(user, day: date) -> dict:
    """Current numbers for the review day (past days: everything open counts as not done)."""
    now = user_now(user)
    now_time = now.time().replace(tzinfo=None) if day == now.date() else time.max
    summary = build_day(user, day, now_time).summary
    return {**summary, **day_counts(summary)}


def complete_day(reflection: DailyReflection) -> DailyReflection:
    now = timezone.now()
    # Tick off the "Night review" item in the schedule first, so it counts in the summary.
    ScheduleItem.objects.filter(
        user=reflection.user,
        date=reflection.date,
        category=Category.NIGHT,
        title__icontains="review",
        is_removed=False,
    ).exclude(status=ScheduleItem.Status.COMPLETED).update(status=ScheduleItem.Status.COMPLETED, completed_at=now)
    reflection.stats = live_day_stats(reflection.user, reflection.date)
    reflection.completed_at = now
    reflection.save()
    return reflection
