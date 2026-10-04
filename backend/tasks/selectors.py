from datetime import date

from django.db.models import Case, IntegerField, Q, QuerySet, Value, When

from core.choices import PRIORITY_RANK

from .models import Task

COMPLETED_LIMIT = 100


def with_display_order(queryset: QuerySet) -> QuerySet:
    """Open tasks first, then by due date/time, then most important first."""
    return queryset.annotate(
        _done=Case(When(status__in=Task.OPEN_STATUSES, then=Value(0)), default=Value(1), output_field=IntegerField()),
        _rank=Case(
            *[When(priority=p, then=Value(rank)) for p, rank in PRIORITY_RANK.items()],
            output_field=IntegerField(),
        ),
    ).order_by("_done", "due_date", "due_time", "_rank", "id")


def today_tasks(queryset: QuerySet, today: date) -> QuerySet:
    """Due today (any status) plus anything overdue that is still open."""
    return queryset.filter(Q(due_date=today) | Q(due_date__lt=today, status__in=Task.OPEN_STATUSES))


def filter_view(queryset: QuerySet, view: str, today: date) -> QuerySet:
    if view == "today":
        return with_display_order(today_tasks(queryset, today))
    if view == "upcoming":
        return with_display_order(queryset.filter(due_date__gt=today, status__in=Task.OPEN_STATUSES))
    if view == "someday":
        return with_display_order(queryset.filter(due_date__isnull=True, status__in=Task.OPEN_STATUSES))
    if view == "completed":
        return queryset.filter(status=Task.Status.COMPLETED).order_by("-completed_at")[:COMPLETED_LIMIT]
    return with_display_order(queryset)
