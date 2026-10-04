from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Goal, GoalProgress


def sync_status(goal: Goal) -> None:
    """Status follows progress — except a paused goal stays paused until resumed."""
    if goal.status == Goal.Status.PAUSED:
        return
    if goal.current_value >= goal.target_value:
        if goal.status != Goal.Status.COMPLETED:
            goal.status = Goal.Status.COMPLETED
            goal.completed_at = timezone.now()
    else:
        goal.completed_at = None
        goal.status = Goal.Status.IN_PROGRESS if goal.current_value > 0 else Goal.Status.NOT_STARTED


@transaction.atomic
def log_progress(goal: Goal, amount: Decimal, mode: str, day: date, note: str = "") -> GoalProgress:
    """mode "add" adds `amount`; mode "set" sets the current value to `amount`."""
    goal = Goal.objects.select_for_update().get(pk=goal.pk)
    new_value = goal.current_value + amount if mode == "add" else amount
    new_value = max(Decimal("0"), new_value)
    entry = GoalProgress.objects.create(
        goal=goal,
        user=goal.user,
        date=day,
        delta=new_value - goal.current_value,
        value_after=new_value,
        note=note,
    )
    goal.current_value = new_value
    sync_status(goal)
    goal.save()
    return entry


@transaction.atomic
def undo_progress(entry: GoalProgress) -> Goal:
    goal = Goal.objects.select_for_update().get(pk=entry.goal_id)
    goal.current_value = max(Decimal("0"), goal.current_value - entry.delta)
    entry.delete()
    sync_status(goal)
    goal.save()
    return goal


@transaction.atomic
def make_main(goal: Goal) -> None:
    Goal.objects.filter(user=goal.user, is_main=True).exclude(pk=goal.pk).update(is_main=False)
    if not goal.is_main:
        goal.is_main = True
        goal.save(update_fields=["is_main", "updated_at"])
