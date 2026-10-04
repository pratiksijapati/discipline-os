from datetime import date, datetime, time, timedelta

from .models import ScheduleItem

# An item without an end time counts as "happening" for this long.
DEFAULT_DURATION = timedelta(minutes=30)

MISSED = "missed"


def effective_end(item: ScheduleItem) -> time:
    if item.end_time:
        return item.end_time
    end = datetime.combine(date.min, item.start_time) + DEFAULT_DURATION
    return end.time() if end.date() == date.min else time.max


def is_happening_now(item: ScheduleItem, now_time: time) -> bool:
    return item.start_time <= now_time < effective_end(item)


def display_status(item: ScheduleItem, today: date, now_time: time) -> str:
    """
    Stored status, except open items whose time has passed are shown as "missed".
    Missed items can still be completed — the label just tells the truth.
    """
    if item.status in (ScheduleItem.Status.COMPLETED, ScheduleItem.Status.SKIPPED):
        return item.status
    if item.date < today:
        return MISSED
    if item.date == today and item.status == ScheduleItem.Status.UPCOMING and effective_end(item) <= now_time:
        return MISSED
    return item.status
