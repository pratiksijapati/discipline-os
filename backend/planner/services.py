from datetime import date, timedelta

from django.db.models import Q

from .models import ScheduleItem, ScheduleTemplate

MAX_RANGE_DAYS = 62


def daterange(start: date, end: date):
    day = start
    while day <= end:
        yield day
        day += timedelta(days=1)


def ensure_occurrences(user, start: date, end: date) -> None:
    """
    Make sure every active template has its ScheduleItem for each day in [start, end].
    Safe to call on every read: existing occurrences are skipped, and the unique
    constraint (with ignore_conflicts) protects against two requests racing.
    """
    templates = list(
        ScheduleTemplate.objects.filter(user=user, is_active=True, start_date__lte=end).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=start)
        )
    )
    if not templates:
        return

    existing = set(
        ScheduleItem.objects.filter(
            template__in=templates, occurrence_date__range=(start, end)
        ).values_list("template_id", "occurrence_date")
    )

    new_items = []
    for template in templates:
        first = max(start, template.start_date)
        last = min(end, template.end_date) if template.end_date else end
        for day in daterange(first, last):
            if (template.id, day) in existing or not template.occurs_on(day):
                continue
            fields = {name: getattr(template, name) for name in template.COPIED_FIELDS}
            new_items.append(ScheduleItem(user=user, template=template, date=day, occurrence_date=day, **fields))

    if new_items:
        ScheduleItem.objects.bulk_create(new_items, ignore_conflicts=True)


def refresh_future_occurrences(template: ScheduleTemplate, today: date) -> None:
    """
    After a template changes, drop its untouched future occurrences. They are
    re-created from the new rule the next time those days are viewed.
    Completed, started, skipped, customized or removed occurrences are kept.
    """
    template.occurrences.filter(
        occurrence_date__gte=today,
        status=ScheduleItem.Status.UPCOMING,
        is_customized=False,
        is_removed=False,
    ).delete()


def delete_template(template: ScheduleTemplate, today: date) -> None:
    """Future untouched occurrences go away; past history stays as one-off items."""
    refresh_future_occurrences(template, today)
    template.occurrences.filter(occurrence_date__gte=today, is_removed=True).delete()
    template.delete()
