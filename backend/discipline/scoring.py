"""
The Discipline Score (0–100).

Each component reports whether it APPLIES to the day, how much of it was done
(ratio 0–1) and a short human detail. The score is the weighted share of the
applicable components, scaled to 100 — so something you haven't set up (no
workout planned on a rest day) never counts against you.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from core.time import get_user_tz
from goals.models import Goal, GoalProgress
from planner.models import Category, RoutineItem, RoutineLog, ScheduleItem
from reflections.models import DailyReflection
from tasks.models import Task
from users.models import UserSettings
from workouts.models import WorkoutPlan

from .services import DaySnapshot

COMPONENTS: list[tuple[str, str, int]] = [
    ("wake_up", "Wake up on time", 15),
    ("morning_routine", "Morning routine", 10),
    ("workout", "Workout", 20),
    ("important_tasks", "Important tasks", 25),
    ("habits", "Habits", 15),
    ("growth", "Personal growth", 10),
    ("reflection", "Night review", 5),
]
DEFAULT_WEIGHTS = {key: weight for key, _, weight in COMPONENTS}
LABELS = {key: label for key, label, _ in COMPONENTS}

# Encouraging, never shaming.
RATINGS = [(90, "Excellent"), (80, "Strong"), (70, "Good"), (60, "Needs improvement"), (0, "Reset tomorrow")]


def rating_for(score: int | None) -> str | None:
    if score is None:
        return None
    return next(label for floor, label in RATINGS if score >= floor)


def weights_for(settings: UserSettings) -> dict[str, int]:
    custom = {k: int(v) for k, v in (settings.score_weights or {}).items() if k in DEFAULT_WEIGHTS}
    return {**DEFAULT_WEIGHTS, **custom}


@dataclass
class Part:
    applicable: bool
    ratio: float = 0.0
    detail: str = ""


NOT_TRACKED = Part(applicable=False, detail="Not tracked today")


def _clock(t: time) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


# ---------- components ----------


def _wake_up(user, day, snap: DaySnapshot, settings, tz) -> Part:
    deadline = (datetime.combine(day, settings.wake_time) + timedelta(minutes=settings.wake_grace_minutes)).time()
    tracked = False
    confirmed: list[time] = []

    routine = snap.routine["routine"]
    if routine:
        steps = RoutineItem.objects.filter(routine_id=routine["id"], is_enabled=True, title__icontains="wake")
        if steps.exists():
            tracked = True
            confirmed += [
                ts.astimezone(tz).time()
                for ts in RoutineLog.objects.filter(item__in=steps, date=day).values_list("completed_at", flat=True)
            ]
    wake_items = [i for i in snap.schedule if "wake" in i.title.lower()]
    if wake_items:
        tracked = True
        confirmed += [
            i.completed_at.astimezone(tz).time()
            for i in wake_items
            if i.status == ScheduleItem.Status.COMPLETED and i.completed_at
        ]

    if not tracked:
        return NOT_TRACKED
    if not confirmed:
        return Part(True, 0.0, f"Tick “Wake up” by {_clock(deadline)}")
    first = min(confirmed)
    if first <= deadline:
        return Part(True, 1.0, f"Up at {_clock(first)}")
    return Part(True, 0.5, f"Up at {_clock(first)} (after {_clock(deadline)})")


def _morning_routine(snap: DaySnapshot) -> Part:
    done, total = snap.routine["completed"], snap.routine["total"]
    if not total:
        return NOT_TRACKED
    return Part(True, done / total, f"{done}/{total} steps")


def _workout(user, day, snap: DaySnapshot) -> Part:
    planned = [p.name for p in WorkoutPlan.objects.filter(user=user, is_active=True) if day.weekday() in (p.days_of_week or [])]
    items = [i for i in snap.schedule if i.category == Category.WORKOUT and i.status != ScheduleItem.Status.SKIPPED]
    done = snap.summary["workout_done"] or any(i.status == ScheduleItem.Status.COMPLETED for i in items)
    if done:
        return Part(True, 1.0, "Done")
    if planned or items:
        return Part(True, 0.0, f"Planned: {planned[0]}" if planned else "Planned")
    return Part(False, 0.0, "Rest day")


def _important_tasks(day, snap: DaySnapshot) -> Part:
    due = [t for t in snap.tasks if t.due_date == day and t.status != Task.Status.SKIPPED]
    important = [t for t in due if t.priority in ("high", "critical")]
    pool, noun = (important, "important tasks") if important else (due, "tasks")
    if pool:
        done = sum(1 for t in pool if t.status == Task.Status.COMPLETED)
        return Part(True, done / len(pool), f"{done}/{len(pool)} {noun}")

    # No tasks today: the day's plan counts instead.
    plan = [i for i in snap.schedule if i.status != ScheduleItem.Status.SKIPPED]
    if plan:
        done = sum(1 for i in plan if i.status == ScheduleItem.Status.COMPLETED)
        return Part(True, done / len(plan), f"{done}/{len(plan)} plan items")
    return NOT_TRACKED


def _habits(snap: DaySnapshot) -> Part:
    cards = [c for c in snap.habit_cards if c["due_today"] or c["completed"]]
    if not cards:
        return NOT_TRACKED
    ratio = sum(min(1.0, c["value"] / c["habit"].target_value) for c in cards) / len(cards)
    done = sum(1 for c in cards if c["completed"])
    return Part(True, ratio, f"{done}/{len(cards)} habits")


def _growth(user, day, snap: DaySnapshot) -> Part:
    has_goals = Goal.objects.filter(user=user, status__in=Goal.OPEN_STATUSES).exists()
    items = [i for i in snap.schedule if i.category in (Category.STUDY, Category.GROWTH)]
    logged = GoalProgress.objects.filter(user=user, date=day, delta__gt=0).exists()
    item_done = any(i.status == ScheduleItem.Status.COMPLETED for i in items)
    if logged:
        return Part(True, 1.0, "Goal progress logged")
    if item_done:
        return Part(True, 1.0, "Study / growth time done")
    if has_goals or items:
        return Part(True, 0.0, "Log progress on a goal")
    return NOT_TRACKED


def _reflection(user, day) -> Part:
    done = DailyReflection.objects.filter(user=user, date=day, completed_at__isnull=False).exists()
    return Part(True, 1.0 if done else 0.0, "Done" if done else "Tonight")


# ---------- score ----------


def compute(user, day: date, snap: DaySnapshot) -> tuple[int | None, list[dict]]:
    settings = UserSettings.for_user(user)
    tz = get_user_tz(user)
    weights = weights_for(settings)
    parts = {
        "wake_up": _wake_up(user, day, snap, settings, tz),
        "morning_routine": _morning_routine(snap),
        "workout": _workout(user, day, snap),
        "important_tasks": _important_tasks(day, snap),
        "habits": _habits(snap),
        "growth": _growth(user, day, snap),
        "reflection": _reflection(user, day),
    }

    breakdown = []
    for key, label, _ in COMPONENTS:
        part, weight = parts[key], weights[key]
        applicable = part.applicable and weight > 0
        breakdown.append(
            {
                "key": key,
                "label": label,
                "weight": weight,
                "applicable": applicable,
                "ratio": round(part.ratio, 3) if applicable else 0,
                "points": round(weight * part.ratio, 1) if applicable else 0,
                "detail": part.detail,
            }
        )

    tracked = [c for c in breakdown if c["applicable"] and c["key"] != "reflection"]
    if not tracked and not parts["reflection"].ratio:
        return None, breakdown  # nothing tracked this day

    total = sum(c["weight"] for c in breakdown if c["applicable"])
    earned = sum(c["weight"] * c["ratio"] for c in breakdown if c["applicable"])
    return (round(100 * earned / total) if total else None), breakdown
