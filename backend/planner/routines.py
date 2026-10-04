from datetime import date

from django.db import transaction

from .models import Routine, RoutineItem, RoutineLog


def default_routine(user) -> Routine | None:
    return Routine.objects.filter(user=user, is_active=True).order_by("-is_default", "id").first()


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
