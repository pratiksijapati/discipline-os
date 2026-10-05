"""
Builds the summary of a day: plan, tasks, habits, routine and workout.
Used by the Today dashboard (live) and by the Night Review (for any day).
Uses a fixed number of queries regardless of how much history exists.
"""

from dataclasses import dataclass
from datetime import date, datetime, time

from core.time import user_now
from habits.services import build_cards
from planner.models import ScheduleItem
from planner.routines import default_routine, progress_for_day
from planner.services import ensure_occurrences
from planner.status import MISSED, display_status, is_happening_now
from tasks.models import DailyFocus, Task
from tasks.selectors import today_tasks, with_display_order
from workouts.models import WorkoutSession
from workouts.services import workout_today


@dataclass
class DaySnapshot:
    day: date
    now_time: time
    schedule: list[ScheduleItem]
    tasks: list[Task]
    habit_cards: list[dict]
    routine: dict
    # Today's one most important thing, if the user set one.
    focus: DailyFocus | None
    summary: dict


@dataclass
class TodaySnapshot(DaySnapshot):
    now: datetime
    workout: dict
    current: ScheduleItem | None
    next: ScheduleItem | None


def pick_current_and_next(items: list[ScheduleItem], now_time: time):
    open_items = [i for i in items if i.status in (ScheduleItem.Status.UPCOMING, ScheduleItem.Status.IN_PROGRESS)]
    current = next((i for i in open_items if i.status == ScheduleItem.Status.IN_PROGRESS), None)
    if current is None:
        current = next((i for i in open_items if is_happening_now(i, now_time)), None)
    upcoming = (i for i in open_items if i is not current and i.start_time > now_time)
    return current, next(upcoming, None)


def _summarize(items, tasks, habit_cards, routine, day, now_time, workout_done: bool, focus: DailyFocus | None) -> dict:
    statuses = [display_status(i, day, now_time) for i in items]
    sched_done = statuses.count(ScheduleItem.Status.COMPLETED)
    sched_total = len(items) - statuses.count(ScheduleItem.Status.SKIPPED)

    days_tasks = [t for t in tasks if t.due_date == day]
    task_done = sum(1 for t in days_tasks if t.status == Task.Status.COMPLETED)
    task_total = sum(1 for t in days_tasks if t.status != Task.Status.SKIPPED)

    due_habits = [c for c in habit_cards if c["due_today"] or c["completed"]]
    habit_done = sum(1 for c in due_habits if c["completed"])

    done = sched_done + task_done + habit_done
    total = sched_total + task_total + len(due_habits)
    if routine["total"]:
        # The routine counts as one item, with partial credit per step ticked.
        done += routine["completed"] / routine["total"]
        total += 1
    return {
        "schedule": {"completed": sched_done, "total": sched_total, "missed": statuses.count(MISSED)},
        "tasks": {
            "completed": task_done,
            "total": task_total,
            "overdue": sum(1 for t in tasks if t.is_open and t.due_date and t.due_date < day),
        },
        "habits": {"completed": habit_done, "total": len(due_habits)},
        "routine": {"completed": routine["completed"], "total": routine["total"]},
        "workout_done": workout_done,
        "focus": {"title": focus.title, "completed": focus.completed} if focus else None,
        # Simple completion %, until the Discipline Score engine arrives in Phase 7.
        "progress": round(100 * done / total) if total else 0,
    }


def build_day(user, day: date, now_time: time) -> DaySnapshot:
    """Snapshot of any day. For past days pass time.max so open items count as missed."""
    ensure_occurrences(user, day, day)
    items = list(ScheduleItem.objects.filter(user=user, date=day, is_removed=False).order_by("start_time", "id"))
    tasks = list(with_display_order(today_tasks(Task.objects.filter(user=user), day)))
    habit_cards = build_cards(user, day)
    routine = progress_for_day(default_routine(user), day)
    workout_done = WorkoutSession.objects.filter(
        user=user, date=day, status=WorkoutSession.Status.COMPLETED
    ).exists()
    focus = DailyFocus.objects.filter(user=user, date=day).first()
    return DaySnapshot(
        day=day,
        now_time=now_time,
        schedule=items,
        tasks=tasks,
        habit_cards=habit_cards,
        routine=routine,
        focus=focus,
        summary=_summarize(items, tasks, habit_cards, routine, day, now_time, workout_done, focus),
    )


def build_today(user) -> TodaySnapshot:
    now = user_now(user)
    today = now.date()
    now_time = now.time().replace(tzinfo=None)
    snap = build_day(user, today, now_time)
    current, upcoming = pick_current_and_next(snap.schedule, now_time)
    return TodaySnapshot(
        **vars(snap),
        now=now,
        workout=workout_today(user, today),
        current=current,
        next=upcoming,
    )


def day_counts(summary: dict) -> dict:
    """Totals for the Night Review: how much got done, and how much didn't."""
    completed = summary["schedule"]["completed"] + summary["tasks"]["completed"] + summary["habits"]["completed"]
    not_done = (
        summary["schedule"]["missed"]
        + (summary["tasks"]["total"] - summary["tasks"]["completed"])
        + (summary["habits"]["total"] - summary["habits"]["completed"])
    )
    return {"completed": completed, "not_done": not_done}
