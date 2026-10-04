"""
Builds "habit cards": each habit plus today's value, this week's strip and
the current streak. All logs needed are fetched in ONE query.
"""

from collections import defaultdict
from datetime import date, timedelta

from users.models import UserSettings

from .models import Habit, HabitLog

STREAK_LOOKBACK_DAYS = 366


def week_start_for(day: date, week_start: int) -> date:
    return day - timedelta(days=(day.weekday() - week_start) % 7)


def current_streak(habit: Habit, values: dict[date, int], today: date) -> int | None:
    """
    Consecutive scheduled days completed, counting back from today.
    Today only counts once it's done — an unfinished today doesn't break the streak.
    Weekly-target habits don't have a daily streak.
    """
    if habit.frequency == Habit.Frequency.WEEKLY_TARGET:
        return None
    day = today if habit.is_met(values.get(today, 0)) else today - timedelta(days=1)
    floor = max(habit.start_date, today - timedelta(days=STREAK_LOOKBACK_DAYS))
    streak = 0
    while day >= floor:
        if habit.is_scheduled_on(day):
            if not habit.is_met(values.get(day, 0)):
                break
            streak += 1
        day -= timedelta(days=1)
    return streak


def build_cards(user, today: date, habits=None) -> list[dict]:
    if habits is None:
        habits = list(Habit.objects.filter(user=user, is_active=True, start_date__lte=today))
    if not habits:
        return []

    week_begin = week_start_for(today, UserSettings.for_user(user).week_start)
    since = min(week_begin, today - timedelta(days=STREAK_LOOKBACK_DAYS))
    values: dict[int, dict[date, int]] = defaultdict(dict)
    for habit_id, day, value in HabitLog.objects.filter(habit__in=habits, date__gte=since).values_list(
        "habit_id", "date", "value"
    ):
        values[habit_id][day] = value

    week_days = [week_begin + timedelta(days=i) for i in range(7)]
    cards = []
    for habit in habits:
        habit_values = values[habit.id]
        value = habit_values.get(today, 0)
        week = [
            {
                "date": day.isoformat(),
                "scheduled": habit.is_scheduled_on(day),
                "done": habit.is_met(habit_values.get(day, 0)),
            }
            for day in week_days
        ]
        week_count = sum(1 for d in week if d["done"])
        done_before_today = sum(1 for d in week if d["done"] and d["date"] < today.isoformat())

        due_today = habit.is_scheduled_on(today)
        if habit.frequency == Habit.Frequency.WEEKLY_TARGET and done_before_today >= (habit.weekly_target or 1):
            due_today = False  # this week's target was already reached

        cards.append(
            {
                "habit": habit,
                "value": value,
                "completed": habit.is_met(value),
                "due_today": due_today,
                "streak": current_streak(habit, habit_values, today),
                "week": week,
                "week_count": week_count,
            }
        )
    return cards


def set_log_value(habit: Habit, day: date, value: int) -> None:
    """Store the absolute value for a day (idempotent). Zero removes the log."""
    if value <= 0:
        HabitLog.objects.filter(habit=habit, date=day).delete()
        return
    HabitLog.objects.update_or_create(habit=habit, date=day, defaults={"value": value, "user": habit.user})
