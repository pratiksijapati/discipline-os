from collections import Counter
from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError

from core.time import user_today
from users.models import UserSettings

from .models import Exercise, Measure, PlanExercise, SessionExercise, WorkoutPlan, WorkoutSession, WorkoutSet

STREAK_LOOKBACK_WEEKS = 104


class ActiveSessionExists(APIException):
    """409: only one workout can be in progress at a time."""

    status_code = status.HTTP_409_CONFLICT

    def __init__(self, session: WorkoutSession):
        super().__init__(
            {"detail": f'"{session.name}" is still in progress. Finish or cancel it first.', "code": "active_session"}
        )


def active_session(user) -> WorkoutSession | None:
    return WorkoutSession.objects.filter(user=user, status__in=WorkoutSession.ACTIVE_STATUSES).first()


@transaction.atomic
def start_session(user, plan: WorkoutPlan | None = None, name: str = "") -> WorkoutSession:
    if existing := active_session(user):
        raise ActiveSessionExists(existing)
    try:
        session = WorkoutSession.objects.create(
            user=user,
            plan=plan,
            name=plan.name if plan else (name or "Workout"),
            date=user_today(user),
            started_at=timezone.now(),
        )
    except IntegrityError:  # another request started one at the same moment
        raise ActiveSessionExists(active_session(user))
    if plan:
        SessionExercise.objects.bulk_create(
            SessionExercise(
                session=session,
                exercise_id=row.exercise_id,
                **{field: getattr(row, field) for field in row.TARGET_FIELDS},
            )
            for row in plan.exercises.all()
        )
    return session


def _require_active(session: WorkoutSession):
    if not session.is_active:
        raise ValidationError("This workout is already finished.")


def pause(session: WorkoutSession) -> WorkoutSession:
    _require_active(session)
    if session.status == WorkoutSession.Status.IN_PROGRESS:
        session.status = WorkoutSession.Status.PAUSED
        session.paused_at = timezone.now()
        session.save(update_fields=["status", "paused_at", "updated_at"])
    return session


def _close_pause(session: WorkoutSession, now) -> None:
    if session.paused_at:
        session.paused_seconds += int((now - session.paused_at).total_seconds())
        session.paused_at = None


def resume(session: WorkoutSession) -> WorkoutSession:
    _require_active(session)
    if session.status == WorkoutSession.Status.PAUSED:
        _close_pause(session, timezone.now())
        session.status = WorkoutSession.Status.IN_PROGRESS
        session.save(update_fields=["status", "paused_at", "paused_seconds", "updated_at"])
    return session


def active_seconds(session: WorkoutSession, now=None) -> int:
    """Time spent working out, excluding pauses."""
    if session.duration_seconds is not None:
        return session.duration_seconds
    end = session.paused_at or now or timezone.now()
    return max(0, int((end - session.started_at).total_seconds()) - session.paused_seconds)


def complete(session: WorkoutSession, notes: str | None = None) -> WorkoutSession:
    _require_active(session)
    if not WorkoutSet.objects.filter(session_exercise__session=session).exists():
        raise ValidationError("Log at least one set, or cancel the workout.")
    now = timezone.now()
    _close_pause(session, now)
    session.status = WorkoutSession.Status.COMPLETED
    session.completed_at = now
    session.duration_seconds = max(0, int((now - session.started_at).total_seconds()) - session.paused_seconds)
    if notes is not None:
        session.notes = notes
    session.save()
    return session


def cancel(session: WorkoutSession) -> WorkoutSession:
    _require_active(session)
    session.status = WorkoutSession.Status.CANCELLED
    session.completed_at = timezone.now()
    session.paused_at = None
    session.save()
    return session


@transaction.atomic
def add_set(session_exercise: SessionExercise, **values) -> WorkoutSet:
    _require_active(session_exercise.session)
    last = session_exercise.sets.select_for_update().aggregate(m=Max("set_number"))["m"] or 0
    return WorkoutSet.objects.create(session_exercise=session_exercise, set_number=last + 1, **values)


def session_totals(session: WorkoutSession) -> dict:
    sets = [s for row in session.exercises.all() for s in row.sets.all()]
    volume = sum(((s.weight_kg or Decimal(0)) * (s.reps or 0) for s in sets), Decimal(0))
    return {
        "exercises": sum(1 for row in session.exercises.all() if row.sets.all()),
        "exercises_planned": len(session.exercises.all()),
        "sets": len(sets),
        "volume_kg": float(volume),
    }


def workout_today(user, today: date) -> dict:
    """For the Today dashboard: what's active, done, and planned for today."""
    active = active_session(user)
    done = (
        WorkoutSession.objects.filter(user=user, date=today, status=WorkoutSession.Status.COMPLETED)
        .order_by("-completed_at")
        .first()
    )
    planned = [
        {"id": plan.id, "name": plan.name}
        for plan in WorkoutPlan.objects.filter(user=user, is_active=True)
        if today.weekday() in (plan.days_of_week or [])
    ]
    return {
        "active": {"id": active.id, "name": active.name, "status": active.status} if active else None,
        "completed": {"id": done.id, "name": done.name, "duration_seconds": done.duration_seconds} if done else None,
        "planned": planned,
    }


# ---------- statistics ----------


def _week_start(day: date, week_start: int) -> date:
    return day - timedelta(days=(day.weekday() - week_start) % 7)


def workout_stats(user, today: date) -> dict:
    settings = UserSettings.for_user(user)
    target = settings.weekly_workout_target
    this_week = _week_start(today, settings.week_start)
    since = this_week - timedelta(weeks=STREAK_LOOKBACK_WEEKS)

    completed = WorkoutSession.objects.filter(user=user, status=WorkoutSession.Status.COMPLETED)
    rows = list(completed.filter(date__gte=since).values_list("date", "duration_seconds"))
    per_week = Counter(_week_start(day, settings.week_start) for day, _ in rows)

    # Current streak: this week counts once its target is met; an unfinished week doesn't break it.
    week = this_week if per_week[this_week] >= target else this_week - timedelta(weeks=1)
    current = 0
    while week >= since and per_week[week] >= target:
        current += 1
        week -= timedelta(weeks=1)

    best = run = 0
    week = since
    while week <= this_week:
        run = run + 1 if per_week[week] >= target else 0
        best = max(best, run)
        week += timedelta(weeks=1)

    month_start = today.replace(day=1)
    next_month = (month_start + timedelta(days=32)).replace(day=1)
    days_in_month = (next_month - month_start).days
    totals = completed.values_list("duration_seconds", flat=True)

    return {
        "week": {"count": per_week[this_week], "target": target},
        "month": {
            "count": sum(1 for day, _ in rows if day >= month_start),
            "target": round(target * days_in_month / 7),
        },
        "week_streak": current,
        "best_week_streak": best,
        "total_workouts": len(totals),
        "total_minutes": sum(d or 0 for d in totals) // 60,
    }


def exercise_history(exercise: Exercise, limit: int = 20) -> list[dict]:
    rows = (
        SessionExercise.objects.filter(exercise=exercise, session__status=WorkoutSession.Status.COMPLETED)
        .select_related("session")
        .prefetch_related("sets")
        .order_by("-session__started_at")[:limit]
    )
    history = []
    for row in rows:
        sets = list(row.sets.all())
        if not sets:
            continue
        weights = [s.weight_kg for s in sets if s.weight_kg is not None]
        history.append(
            {
                "session_id": row.session_id,
                "date": row.session.date.isoformat(),
                "sets": [
                    {"reps": s.reps, "weight_kg": float(s.weight_kg) if s.weight_kg is not None else None,
                     "duration_seconds": s.duration_seconds}
                    for s in sets
                ],
                "best_weight_kg": float(max(weights)) if weights else None,
                "total_reps": sum(s.reps or 0 for s in sets),
                "best_duration_seconds": max((s.duration_seconds or 0 for s in sets), default=0) or None,
            }
        )
    return history


# ---------- starter content ----------

STARTER_EXERCISES = [
    {"name": "Bench Press", "category": "strength", "default_sets": 3, "default_reps": 10},
    {"name": "Push-ups", "category": "bodyweight", "default_sets": 3, "default_reps": 15},
    {"name": "Shoulder Press", "category": "strength", "default_sets": 3, "default_reps": 10},
    {"name": "Tricep Extension", "category": "strength", "default_sets": 3, "default_reps": 12},
    {"name": "Plank", "category": "core", "measure": Measure.TIME, "default_sets": 3, "default_duration_seconds": 60},
    {"name": "Squats", "category": "bodyweight", "default_sets": 3, "default_reps": 15},
    {"name": "Lunges", "category": "bodyweight", "default_sets": 3, "default_reps": 12},
    {"name": "Pull-ups", "category": "bodyweight", "default_sets": 3, "default_reps": 8},
    {"name": "Jumping Jacks", "category": "cardio", "measure": Measure.TIME, "default_sets": 3, "default_duration_seconds": 45},
]

STARTER_PLANS = {
    "Push Day": ["Bench Press", "Push-ups", "Shoulder Press", "Tricep Extension", "Plank"],
    "Full Body (no equipment)": ["Squats", "Push-ups", "Lunges", "Plank", "Jumping Jacks"],
}


@transaction.atomic
def create_starter_content(user) -> list[WorkoutPlan]:
    """Adds the starter exercises (skipping names that exist) and plans that don't exist yet."""
    existing = {e.name.lower(): e for e in Exercise.objects.filter(user=user)}
    for spec in STARTER_EXERCISES:
        if spec["name"].lower() not in existing:
            existing[spec["name"].lower()] = Exercise.objects.create(user=user, **spec)

    created = []
    plan_names = {p.lower() for p in WorkoutPlan.objects.filter(user=user).values_list("name", flat=True)}
    for plan_name, exercise_names in STARTER_PLANS.items():
        if plan_name.lower() in plan_names:
            continue
        plan = WorkoutPlan.objects.create(user=user, name=plan_name)
        PlanExercise.objects.bulk_create(
            PlanExercise(plan=plan, exercise=existing[name.lower()], position=i, **targets_from(existing[name.lower()]))
            for i, name in enumerate(exercise_names, start=1)
        )
        created.append(plan)
    return created


def targets_from(exercise: Exercise) -> dict:
    return {
        "target_sets": exercise.default_sets,
        "target_reps": exercise.default_reps,
        "target_duration_seconds": exercise.default_duration_seconds,
        "target_weight_kg": exercise.default_weight_kg,
    }
