"""
Builds the Today dashboard in one pass: the plan for today, what to do NOW,
what's NEXT, today's tasks, habits and the morning routine. Uses a fixed number
of queries regardless of how much history exists.
"""

from dataclasses import dataclass
from datetime import date, datetime, time

from core.time import user_now
from habits.services import build_cards
from planner.models import ScheduleItem
from planner.routines import default_routine, progress_for_day
from planner.services import ensure_occurrences
from planner.status import MISSED, display_status, is_happening_now
from tasks.models import Task
from tasks.selectors import today_tasks, with_display_order


@dataclass
class TodaySnapshot:
    now: datetime
    today: date
    now_time: time
    schedule: list[ScheduleItem]
    tasks: list[Task]
    habit_cards: list[dict]
    routine: dict
    current: ScheduleItem | None
    next: ScheduleItem | None
    summary: dict


def pick_current_and_next(items: list[ScheduleItem], now_time: time):
    open_items = [i for i in items if i.status in (ScheduleItem.Status.UPCOMING, ScheduleItem.Status.IN_PROGRESS)]
    current = next((i for i in open_items if i.status == ScheduleItem.Status.IN_PROGRESS), None)
    if current is None:
        current = next((i for i in open_items if is_happening_now(i, now_time)), None)
    upcoming = (i for i in open_items if i is not current and i.start_time > now_time)
    return current, next(upcoming, None)


def _summarize(items, tasks, habit_cards, routine, today, now_time) -> dict:
    statuses = [display_status(i, today, now_time) for i in items]
    sched_done = statuses.count(ScheduleItem.Status.COMPLETED)
    sched_total = len(items) - statuses.count(ScheduleItem.Status.SKIPPED)

    todays_tasks = [t for t in tasks if t.due_date == today]
    task_done = sum(1 for t in todays_tasks if t.status == Task.Status.COMPLETED)
    task_total = sum(1 for t in todays_tasks if t.status != Task.Status.SKIPPED)

    due_habits = [c for c in habit_cards if c["due_today"] or c["completed"]]
    habit_done = sum(1 for c in due_habits if c["completed"])

    done = sched_done + task_done + habit_done
    total = sched_total + task_total + len(due_habits)
    return {
        "schedule": {"completed": sched_done, "total": sched_total, "missed": statuses.count(MISSED)},
        "tasks": {
            "completed": task_done,
            "total": task_total,
            "overdue": sum(1 for t in tasks if t.is_open and t.due_date and t.due_date < today),
        },
        "habits": {"completed": habit_done, "total": len(due_habits)},
        "routine": {"completed": routine["completed"], "total": routine["total"]},
        # Simple completion %, until the Discipline Score engine arrives in Phase 7.
        "progress": round(100 * done / total) if total else 0,
    }


def build_today(user) -> TodaySnapshot:
    now = user_now(user)
    today = now.date()
    now_time = now.time().replace(tzinfo=None)

    ensure_occurrences(user, today, today)
    items = list(ScheduleItem.objects.filter(user=user, date=today, is_removed=False).order_by("start_time", "id"))
    tasks = list(with_display_order(today_tasks(Task.objects.filter(user=user), today)))
    habit_cards = build_cards(user, today)
    routine = progress_for_day(default_routine(user), today)
    current, upcoming = pick_current_and_next(items, now_time)

    return TodaySnapshot(
        now=now,
        today=today,
        now_time=now_time,
        schedule=items,
        tasks=tasks,
        habit_cards=habit_cards,
        routine=routine,
        current=current,
        next=upcoming,
        summary=_summarize(items, tasks, habit_cards, routine, today, now_time),
    )
