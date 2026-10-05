"""
Stores daily scores and calculates streaks.

- Today's score is recalculated whenever it's read.
- Past days are scored once, marked final and never change.
"""

from datetime import date, time, timedelta

from core.time import get_user_tz, user_now
from users.models import UserSettings
from workouts.services import workout_stats

from . import scoring
from .models import DailyScore
from .services import DaySnapshot, build_day

HISTORY_DAYS = 400


def save_score(user, day: date, snap: DaySnapshot, final: bool) -> DailyScore:
    score, breakdown = scoring.compute(user, day, snap)
    obj, _ = DailyScore.objects.update_or_create(
        user=user, date=day, defaults={"score": score, "breakdown": breakdown, "is_final": final}
    )
    return obj


def finalize_past_days(user, today: date) -> None:
    """Score every finished day since the account was created that doesn't have a final score yet."""
    joined = user.created_at.astimezone(get_user_tz(user)).date()
    start = max(joined, today - timedelta(days=HISTORY_DAYS))
    yesterday = today - timedelta(days=1)
    if start > yesterday:
        return
    done = set(
        DailyScore.objects.filter(user=user, is_final=True, date__range=(start, yesterday)).values_list("date", flat=True)
    )
    day = start
    while day <= yesterday:
        if day not in done:
            save_score(user, day, build_day(user, day, time.max), final=True)
        day += timedelta(days=1)


def score_for(user, day: date) -> DailyScore:
    """(Re)score one day — used after the Night Review is completed."""
    today = user_now(user).date()
    now_time = user_now(user).time().replace(tzinfo=None) if day == today else time.max
    return save_score(user, day, build_day(user, day, now_time), final=day < today)


# ---------- streaks ----------


def _streak(states: dict[date, bool | None], today: date) -> dict:
    """
    states: day -> True (success), False (missed), None (not tracked — skipped).
    Today only counts once it's a success; an unfinished today never breaks a streak.
    """
    days = sorted(states)
    best = run = 0
    for day in days:
        if states[day] is True:
            run += 1
            best = max(best, run)
        elif states[day] is False and day != today:
            run = 0

    current = 0
    day = today
    if states.get(today) is not True:
        day -= timedelta(days=1)
    while days and day >= days[0]:
        state = states.get(day)
        if state is True:
            current += 1
        elif state is False:
            break
        day -= timedelta(days=1)
    return {"current": current, "best": max(best, current)}


def streaks(user, today: date, today_score: DailyScore) -> dict:
    settings = UserSettings.for_user(user)
    rows = list(DailyScore.objects.filter(user=user, date__gte=today - timedelta(days=HISTORY_DAYS), date__lt=today))
    rows.append(today_score)

    def component_state(row, key, full_only=True):
        comp = row.component(key)
        if not comp or not comp["applicable"]:
            return None
        return comp["ratio"] >= (0.999 if full_only else 0.5)

    discipline = {r.date: (None if r.score is None else r.score >= settings.streak_threshold) for r in rows}
    wake = {r.date: component_state(r, "wake_up") for r in rows}
    habits = {r.date: component_state(r, "habits") for r in rows}
    workouts = workout_stats(user, today)

    return {
        "discipline": {**_streak(discipline, today), "threshold": settings.streak_threshold, "unit": "days"},
        "wake_up": {**_streak(wake, today), "unit": "days"},
        "habits": {**_streak(habits, today), "unit": "days"},
        "workout": {"current": workouts["week_streak"], "best": workouts["best_week_streak"], "unit": "weeks"},
    }


def score_payload(user, score: DailyScore) -> dict:
    settings = UserSettings.for_user(user)
    return {
        "date": score.date.isoformat(),
        "score": score.score,
        "rating": scoring.rating_for(score.score),
        "target": settings.daily_target_score,
        "is_final": score.is_final,
        "max_possible": scoring.max_possible(score.score, score.breakdown, score.is_final),
        "breakdown": score.breakdown,
    }
