"""
Decides which reminders are due and sends them.

`run()` is called every minute (by the reminder_worker command or a cron URL).
A reminder is due if its time falls within the last few minutes, so a slightly
late run still delivers it. Each reminder has a unique key that is recorded
before sending, so it is never delivered twice.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from django.utils import timezone

from core.time import get_user_tz
from goals.models import Goal
from habits.services import build_cards
from planner.models import Category, ScheduleItem
from planner.services import ensure_occurrences
from reflections.models import DailyReflection
from tasks.models import Task
from users.models import User, UserSettings

from .models import NotificationPreference, SentReminder
from .push import send_to_user

CATCH_UP = timedelta(minutes=5)
KEEP_SENT_DAYS = 3


@dataclass
class Reminder:
    key: str
    title: str
    body: str
    url: str


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def _clock(t) -> str:
    return t.strftime("%I:%M %p").lstrip("0")


def due_reminders(user, now: datetime) -> list[Reminder]:
    """Everything due for this user in (now - CATCH_UP, now]. `now` is in the user's timezone."""
    prefs = NotificationPreference.for_user(user)
    if not prefs.enabled:
        return []
    today = now.date()

    def at(t) -> datetime:
        return datetime.combine(today, t, tzinfo=now.tzinfo)

    def is_due(moment: datetime) -> bool:
        return now - CATCH_UP < moment <= now

    out: list[Reminder] = []

    # Schedule items (and workouts, even without a reminder set)
    if prefs.schedule_reminders or prefs.workout_reminder:
        ensure_occurrences(user, today, today)
        for item in ScheduleItem.objects.filter(
            user=user, date=today, is_removed=False, status=ScheduleItem.Status.UPCOMING
        ):
            is_workout = item.category == Category.WORKOUT
            lead = item.reminder_minutes if prefs.schedule_reminders else None
            if lead is None and is_workout and prefs.workout_reminder:
                lead = prefs.workout_lead_minutes
            if lead is None or not is_due(at(item.start_time) - timedelta(minutes=lead)):
                continue
            when = f"starts in {_plural(lead, 'minute')}" if lead else "is starting now"
            out.append(
                Reminder(
                    # Start time in the key: an item moved to later today gets a fresh reminder.
                    key=f"schedule:{item.id}:{today}:{item.start_time:%H%M}",
                    title=f"{item.title} {when}",
                    body=f"{_clock(item.start_time)} · tap to open your plan",
                    url="/workout" if is_workout else "/today",
                )
            )

    # Wake-up
    settings = UserSettings.for_user(user)
    if prefs.wake_up and is_due(at(settings.wake_time)):
        if settings.wake_challenge_enabled:
            out.append(Reminder(f"wake:{today}", "Good morning ☀️", "Your wake-up challenge is ready — tap to start.", "/wake"))
        else:
            out.append(Reminder(f"wake:{today}", "Good morning ☀️", "Time to get up — tap to start your day.", "/today"))

    # Tasks still open
    if prefs.tasks and is_due(at(prefs.tasks_time)):
        open_tasks = Task.objects.filter(user=user, due_date=today, status__in=Task.OPEN_STATUSES)
        important = open_tasks.filter(priority__in=["high", "critical"]).count()
        remaining = open_tasks.count()
        if important:
            out.append(
                Reminder(f"tasks:{today}", f"{_plural(important, 'important task')} left", f"You still have {_plural(important, 'important task')} remaining today.", "/tasks")
            )
        elif remaining:
            out.append(Reminder(f"tasks:{today}", f"{_plural(remaining, 'task')} left", "A few tasks are still open today.", "/tasks"))

    # Habits left
    if prefs.habits and is_due(at(prefs.habits_time)):
        left = [c["habit"].name for c in build_cards(user, today) if c["due_today"] and not c["completed"]]
        if left:
            names = ", ".join(left[:2]) + (f" and {len(left) - 2} more" if len(left) > 2 else "")
            out.append(Reminder(f"habits:{today}", f"{_plural(len(left), 'habit')} left today", names, "/habits"))

    # Night review
    if prefs.night_review and is_due(at(prefs.night_review_time)):
        done = DailyReflection.objects.filter(user=user, date=today, completed_at__isnull=False).exists()
        if not done:
            out.append(Reminder(f"review:{today}", "Night review is ready", "Two minutes to close the day.", "/reflection"))

    # Goal deadlines (today or tomorrow)
    if prefs.goal_deadlines and is_due(at(prefs.goal_deadlines_time)):
        tomorrow = today + timedelta(days=1)
        for goal in Goal.objects.filter(user=user, status__in=Goal.OPEN_STATUSES, deadline__in=[today, tomorrow]):
            when = "today" if goal.deadline == today else "tomorrow"
            out.append(
                Reminder(
                    f"goal:{goal.id}:{today}",
                    f"“{goal.title}” is due {when}",
                    f"You're at {goal.progress_pct}%. One push today?",
                    "/growth",
                )
            )
    return out


def run(now_utc: datetime | None = None) -> int:
    """One pass over every user with a subscribed device. Returns how many reminders were sent."""
    now_utc = now_utc or timezone.now()
    sent = 0
    users = User.objects.filter(is_active=True, push_subscriptions__isnull=False).distinct()
    for user in users:
        local_now = now_utc.astimezone(get_user_tz(user))
        for reminder in due_reminders(user, local_now):
            # Recorded before sending, so even a crash mid-send can't cause a duplicate.
            _, created = SentReminder.objects.get_or_create(user=user, key=reminder.key)
            if not created:
                continue  # already sent
            send_to_user(user, reminder.title, reminder.body, reminder.url, tag=reminder.key)
            sent += 1
    SentReminder.objects.filter(sent_at__lt=now_utc - timedelta(days=KEEP_SENT_DAYS)).delete()
    return sent
