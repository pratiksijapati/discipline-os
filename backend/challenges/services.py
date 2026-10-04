import random

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.time import user_today
from planner.models import ScheduleItem
from planner.routines import default_routine, set_item_done
from users.models import UserSettings

from .models import MOVEMENT_TYPES, ChallengeType, WakeChallengeSession

# The phone's clock and the server's can differ by a moment.
CLOCK_TOLERANCE_SECONDS = 3
MATH_PROBLEMS = 3


def completed_today(user) -> WakeChallengeSession | None:
    return (
        WakeChallengeSession.objects.filter(
            user=user, date=user_today(user), status=WakeChallengeSession.Status.COMPLETED
        )
        .order_by("completed_at")
        .first()
    )


def _math_problems() -> list[dict]:
    rng = random.SystemRandom()
    problems = []
    for _ in range(MATH_PROBLEMS):
        if rng.random() < 0.5:
            a, b = rng.randint(12, 49), rng.randint(12, 49)
            problems.append({"text": f"{a} + {b}", "answer": a + b})
        else:
            a, b = rng.randint(3, 12), rng.randint(3, 12)
            problems.append({"text": f"{a} × {b}", "answer": a * b})
    return problems


def start(user, challenge_type: str, method: str) -> WakeChallengeSession:
    settings = UserSettings.for_user(user)
    if challenge_type == ChallengeType.MATH:
        method = WakeChallengeSession.Method.MATH
    elif method == WakeChallengeSession.Method.MATH:
        raise ValidationError({"method": ["Movement challenges use the camera or the timer."]})

    # Only one attempt runs at a time; starting again replaces an unfinished one.
    WakeChallengeSession.objects.filter(user=user, status=WakeChallengeSession.Status.IN_PROGRESS).update(
        status=WakeChallengeSession.Status.ABANDONED
    )
    details = {"problems": _math_problems()} if challenge_type == ChallengeType.MATH else {}
    return WakeChallengeSession.objects.create(
        user=user,
        date=user_today(user),
        challenge_type=challenge_type,
        method=method,
        target_seconds=0 if challenge_type == ChallengeType.MATH else settings.wake_challenge_seconds,
        started_at=timezone.now(),
        details=details,
    )


def _tick_morning(session: WakeChallengeSession) -> None:
    """Completing the challenge ticks 'Wake up' (and a 'challenge'/'dance' step) in the routine and schedule."""
    routine = default_routine(session.user)
    if routine:
        for step in routine.items.filter(is_enabled=True):
            title = step.title.lower()
            if "wake" in title or "challenge" in title or (session.challenge_type == ChallengeType.DANCE and "dance" in title):
                set_item_done(step, session.date, True)
    ScheduleItem.objects.filter(
        user=session.user, date=session.date, title__icontains="wake", is_removed=False
    ).exclude(status=ScheduleItem.Status.COMPLETED).update(
        status=ScheduleItem.Status.COMPLETED, completed_at=session.completed_at
    )


@transaction.atomic
def complete(session: WakeChallengeSession, active_seconds: int = 0, answers: list | None = None) -> WakeChallengeSession:
    if session.status != WakeChallengeSession.Status.IN_PROGRESS:
        raise ValidationError("This challenge attempt is already finished — start a new one.")
    now = timezone.now()

    if session.challenge_type in MOVEMENT_TYPES:
        elapsed = (now - session.started_at).total_seconds()
        if elapsed + CLOCK_TOLERANCE_SECONDS < session.target_seconds:
            raise ValidationError(f"Keep going — the challenge takes {session.target_seconds} seconds.")
        if active_seconds + CLOCK_TOLERANCE_SECONDS < session.target_seconds:
            raise ValidationError("Not quite there — keep moving until the timer reaches zero.")
        session.active_seconds = min(active_seconds, session.target_seconds)
    else:
        expected = [p["answer"] for p in session.details.get("problems", [])]
        if not answers or len(answers) != len(expected):
            raise ValidationError({"answers": [f"Answer all {len(expected)} problems."]})
        wrong = [i + 1 for i, (got, want) in enumerate(zip(answers, expected)) if got != want]
        if wrong:
            raise ValidationError({"answers": [f"Problem {', '.join(map(str, wrong))} isn't right — try again."]})
        session.active_seconds = int((now - session.started_at).total_seconds())

    session.status = WakeChallengeSession.Status.COMPLETED
    session.completed_at = now
    session.save()
    _tick_morning(session)
    return session
