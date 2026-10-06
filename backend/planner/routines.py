from datetime import date

from django.db import transaction

from .models import MinimumDay, Routine, RoutineItem, RoutineLog


def default_routine(user) -> Routine | None:
    """The morning routine. The Minimum Day checklist is never it."""
    return (
        Routine.objects.filter(user=user, is_active=True, kind=Routine.Kind.MORNING).order_by("-is_default", "id").first()
    )


def minimum_checklist(user) -> Routine | None:
    return Routine.objects.filter(user=user, kind=Routine.Kind.MINIMUM).first()


def minimum_day_progress(user, day: date) -> dict | None:
    """The Minimum Day checklist's progress on `day`, or None if `day` isn't a Minimum Day."""
    if not MinimumDay.objects.filter(user=user, date=day).exists():
        return None
    return progress_for_day(minimum_checklist(user), day)


@transaction.atomic
def make_default(routine: Routine) -> None:
    Routine.objects.filter(user=routine.user, is_default=True).exclude(pk=routine.pk).update(is_default=False)
    if not routine.is_default:
        routine.is_default = True
        routine.save(update_fields=["is_default", "updated_at"])


def progress_for_day(routine: Routine | None, day: date) -> dict:
    """Enabled items with a done flag for `day`, plus totals."""
    if routine is None:
        return {"routine": None, "date": day.isoformat(), "items": [], "completed": 0, "total": 0}

    items = list(routine.items.filter(is_enabled=True))
    done_ids = set(RoutineLog.objects.filter(item__in=items, date=day).values_list("item_id", flat=True))
    rows = [
        {
            "id": item.id,
            "title": item.title,
            "position": item.position,
            "duration_minutes": item.duration_minutes,
            "done": item.id in done_ids,
        }
        for item in items
    ]
    return {
        "routine": {"id": routine.id, "name": routine.name, "is_default": routine.is_default},
        "date": day.isoformat(),
        "items": rows,
        "completed": len(done_ids),
        "total": len(rows),
    }


def set_item_done(item: RoutineItem, day: date, done: bool) -> None:
    if done:
        RoutineLog.objects.get_or_create(item=item, date=day, defaults={"user": item.routine.user})
    else:
        RoutineLog.objects.filter(item=item, date=day).delete()


@transaction.atomic
def set_minimum_checklist(user, titles: list[str]) -> Routine:
    """Replace the checklist with `titles`, keeping steps (and today's ticks) whose title is unchanged."""
    routine, _ = Routine.objects.get_or_create(
        user=user, kind=Routine.Kind.MINIMUM, defaults={"name": "Minimum day", "is_default": False}
    )
    existing = {item.title: item for item in routine.items.all()}
    keep = []
    for position, title in enumerate(titles, start=1):
        item = existing.pop(title, None)
        if item is None:
            item = RoutineItem(routine=routine, title=title)
        item.position, item.is_enabled = position, True
        item.save()
        keep.append(item.id)
    routine.items.exclude(id__in=keep).delete()
    return routine


def minimum_day_state(user, day: date) -> dict:
    """Is `day` a Minimum Day, why, and the checklist with today's ticks."""
    checklist = progress_for_day(minimum_checklist(user), day)
    today = MinimumDay.objects.filter(user=user, date=day).first()
    return {
        "date": day.isoformat(),
        "active": today is not None,
        "reason": today.reason if today else "",
        "configured": checklist["total"] > 0,
        "checklist": checklist,
    }
