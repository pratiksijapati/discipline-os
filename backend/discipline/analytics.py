"""
Progress analytics and the weekly review.

Rates for wake-up, habits and routine come from the stored daily score
breakdowns, so analytics always agree with the score you saw that day.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta

from django.db.models import Sum

from core.time import get_user_tz
from goals.models import Goal, GoalProgress
from planner.models import Category, ScheduleItem
from reflections.models import DailyReflection
from tasks.models import Task
from users.models import UserSettings
from workouts.models import WorkoutSession

from .models import DailyScore
from .scoring import LABELS, rating_for

RANGES = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}

FOCUS_ADVICE = {
    "wake_up": "Protect your wake-up: same time every day, and tick “Wake up” right away.",
    "morning_routine": "Shorten the morning routine to the steps you really do, then do all of them.",
    "workout": "Put workouts in your schedule at a fixed time so they're not left to willpower.",
    "important_tasks": "Pick fewer important tasks per day — one or two you will definitely finish.",
    "habits": "Focus on your hardest habit first thing, before the day gets busy.",
    "growth": "Block 30 minutes for study or a goal, and log it the moment you finish.",
    "reflection": "Do the night review right after your last schedule item — it takes two minutes.",
}


def _pct(part: float, whole: float) -> int | None:
    return round(100 * part / whole) if whole else None


def _component_stats(rows: list[DailyScore], key: str) -> dict:
    """Average ratio and full-success days of one component over the rows where it applied."""
    ratios = [c["ratio"] for r in rows if (c := r.component(key)) and c["applicable"]]
    return {
        "tracked_days": len(ratios),
        "success_days": sum(1 for x in ratios if x >= 0.999),
        "rate": round(100 * sum(ratios) / len(ratios)) if ratios else None,
    }


def _hours_of(item: ScheduleItem) -> float:
    if not item.end_time:
        return 0.0
    start = datetime.combine(item.date, item.start_time)
    end = datetime.combine(item.date, item.end_time)
    return max(0.0, (end - start).total_seconds() / 3600)


def _learning_hours(user, start: date, end: date) -> float:
    """Hours logged on time-based goals plus completed study/growth schedule time."""
    goal_hours = (
        GoalProgress.objects.filter(
            user=user, date__range=(start, end), goal__measure=Goal.Measure.DURATION, delta__gt=0
        ).aggregate(total=Sum("delta"))["total"]
        or 0
    )
    study = ScheduleItem.objects.filter(
        user=user,
        date__range=(start, end),
        category__in=[Category.STUDY, Category.GROWTH],
        status=ScheduleItem.Status.COMPLETED,
        is_removed=False,
    )
    return round(float(goal_hours) + sum(_hours_of(i) for i in study), 2)


def _task_stats(user, start: date, end: date) -> dict:
    tasks = Task.objects.filter(user=user, due_date__range=(start, end)).exclude(status=Task.Status.SKIPPED)
    total = tasks.count()
    done = tasks.filter(status=Task.Status.COMPLETED).count()
    return {"completed": done, "total": total, "rate": _pct(done, total)}


def _workouts(user, start: date, end: date, week_start: int) -> dict:
    sessions = list(
        WorkoutSession.objects.filter(
            user=user, status=WorkoutSession.Status.COMPLETED, date__range=(start, end)
        ).values_list("date", "duration_seconds")
    )
    per_week: dict[date, int] = defaultdict(int)
    for day, _ in sessions:
        per_week[day - timedelta(days=(day.weekday() - week_start) % 7)] += 1
    first = start - timedelta(days=(start.weekday() - week_start) % 7)
    weeks = []
    week = first
    while week <= end:
        weeks.append({"week_start": week.isoformat(), "count": per_week.get(week, 0)})
        week += timedelta(weeks=1)
    return {
        "count": len(sessions),
        "minutes": sum(d or 0 for _, d in sessions) // 60,
        "per_week": weeks,
    }


def progress(user, today: date, range_key: str) -> dict:
    days = RANGES[range_key]
    start, end = today - timedelta(days=days - 1), today
    settings = UserSettings.for_user(user)
    all_rows = list(DailyScore.objects.filter(user=user, date__range=(start, end)).order_by("date"))
    by_date = {r.date: r for r in all_rows}
    # Averages and rates use finished days only, so an unfinished today never drags them down.
    rows = [r for r in all_rows if r.is_final]
    scored = [r for r in rows if r.score is not None]

    series = []
    day = start
    while day <= end:
        row = by_date.get(day)
        series.append({"date": day.isoformat(), "score": row.score if row else None, "is_final": bool(row and row.is_final)})
        day += timedelta(days=1)

    best = max(scored, key=lambda r: (r.score, r.date), default=None)
    reflections = DailyReflection.objects.filter(user=user, date__range=(start, end), completed_at__isnull=False).count()
    joined = user.created_at.astimezone(get_user_tz(user)).date()
    elapsed_days = (end - max(start, joined)).days + 1

    return {
        "range": range_key,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "score": {
            "average": round(sum(r.score for r in scored) / len(scored)) if scored else None,
            "days_scored": len(scored),
            "days_at_threshold": sum(1 for r in scored if r.score >= settings.streak_threshold),
            "threshold": settings.streak_threshold,
            "target": settings.daily_target_score,
            "best": {"date": best.date.isoformat(), "score": best.score} if best else None,
            "series": series,
        },
        "tasks": _task_stats(user, start, end),
        "wake_up": _component_stats(rows, "wake_up"),
        "habits": _component_stats(rows, "habits"),
        "morning_routine": _component_stats(rows, "morning_routine"),
        "reflection": {"completed_days": reflections, "days": max(1, min(days, elapsed_days))},
        "workouts": {**_workouts(user, start, end, settings.week_start), "weekly_target": settings.weekly_workout_target},
        "growth": {
            "learning_hours": _learning_hours(user, start, end),
            "entries": GoalProgress.objects.filter(user=user, date__range=(start, end), delta__gt=0).count(),
            "goals_completed": Goal.objects.filter(
                user=user, status=Goal.Status.COMPLETED, completed_at__date__range=(start, end)
            ).count(),
        },
    }


# ---------- weekly review ----------


def week_bounds(day: date, week_start: int) -> tuple[date, date]:
    first = day - timedelta(days=(day.weekday() - week_start) % 7)
    return first, first + timedelta(days=6)


def weekly_review(user, today: date, offset_weeks: int = 0) -> dict:
    """offset_weeks: 0 = this week, 1 = last week, …"""
    settings = UserSettings.for_user(user)
    start, end = week_bounds(today - timedelta(weeks=offset_weeks), settings.week_start)
    last_day = min(end, today)
    all_rows = list(DailyScore.objects.filter(user=user, date__range=(start, last_day)).order_by("date"))
    rows = [r for r in all_rows if r.is_final]  # finished days only
    scored = [r for r in rows if r.score is not None]

    components = {key: _component_stats(rows, key) for key in LABELS}
    wake = components["wake_up"]
    habits = components["habits"]
    tasks = _task_stats(user, start, last_day)
    workouts = WorkoutSession.objects.filter(
        user=user, status=WorkoutSession.Status.COMPLETED, date__range=(start, last_day)
    ).count()
    learning = _learning_hours(user, start, last_day)

    best = max(scored, key=lambda r: (r.score, r.date), default=None)
    # Weakest part of the week: lowest average among components that applied on 2+ days.
    ranked = sorted(
        ((key, s) for key, s in components.items() if s["rate"] is not None and s["tracked_days"] >= 2),
        key=lambda kv: kv[1]["rate"],
    )
    weakest = ranked[0] if ranked and ranked[0][1]["rate"] < 80 else None
    strongest = ranked[-1] if ranked and ranked[-1][1]["rate"] >= 70 else None

    went_well, struggled = [], []
    mentioned: set[str] = set()  # components already covered, so nothing is said twice
    if wake["tracked_days"] and wake["success_days"] >= max(1, round(0.7 * wake["tracked_days"])):
        went_well.append(f"Woke up on time {wake['success_days']} of {wake['tracked_days']} days.")
        mentioned.add("wake_up")
    if workouts >= settings.weekly_workout_target:
        went_well.append(f"Hit your workout target ({workouts} of {settings.weekly_workout_target}).")
        mentioned.add("workout")
    if tasks["rate"] is not None and tasks["rate"] >= 80:
        went_well.append(f"Finished {tasks['completed']} of {tasks['total']} tasks.")
        mentioned.add("important_tasks")
    if strongest and strongest[0] not in mentioned:
        went_well.append(f"Strongest area: {LABELS[strongest[0]].lower()} ({strongest[1]['rate']}%).")
    if learning >= 1:
        went_well.append(f"Put {learning:g} hours into learning.")

    if weakest:
        struggled.append(f"{LABELS[weakest[0]]} averaged {weakest[1]['rate']}%.")
    if workouts < settings.weekly_workout_target and end <= today:
        struggled.append(f"Workouts: {workouts} of {settings.weekly_workout_target}.")
    if tasks["total"] and (tasks["rate"] or 0) < 60:
        struggled.append(f"Only {tasks['completed']} of {tasks['total']} tasks done.")

    own_notes = list(
        DailyReflection.objects.filter(user=user, date__range=(start, last_day), completed_at__isnull=False)
        .exclude(improve="")
        .order_by("date")
        .values_list("improve", flat=True)
    )

    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "is_current": start <= today <= end,
        "days_scored": len(scored),
        "score": {
            "average": round(sum(r.score for r in scored) / len(scored)) if scored else None,
            "rating": rating_for(round(sum(r.score for r in scored) / len(scored))) if scored else None,
            "days": [{"date": r.date.isoformat(), "score": r.score, "is_final": r.is_final} for r in all_rows],
        },
        "best_day": {"date": best.date.isoformat(), "score": best.score} if best else None,
        "wake_up": {"success_days": wake["success_days"], "tracked_days": wake["tracked_days"]},
        "workouts": {"count": workouts, "target": settings.weekly_workout_target},
        "tasks": tasks,
        "habits": {"rate": habits["rate"]},
        "learning_hours": learning,
        "needs_attention": {"key": weakest[0], "label": LABELS[weakest[0]], "rate": weakest[1]["rate"]} if weakest else None,
        "went_well": went_well,
        "struggled": struggled,
        "focus_next_week": FOCUS_ADVICE[weakest[0]] if weakest else "Keep the same rhythm — it's working.",
        "your_notes": own_notes[-5:],
    }
