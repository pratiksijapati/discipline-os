"""
The single source of truth for "what day is it for this user?".

Never call date.today() or datetime.now() in app code. The server runs
in UTC, so those would give the wrong day for a user in Kathmandu
between 00:00 and 05:45 local time.
"""

from datetime import date, datetime
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError, available_timezones

from django.core.exceptions import ValidationError
from django.utils import timezone

DEFAULT_TIMEZONE = "Asia/Kathmandu"


@lru_cache(maxsize=1)
def _valid_timezones() -> frozenset[str]:
    return frozenset(available_timezones())


def validate_timezone(value: str) -> None:
    if value not in _valid_timezones():
        raise ValidationError(f"'{value}' is not a valid timezone.")


def get_user_tz(user) -> ZoneInfo:
    try:
        return ZoneInfo(getattr(user, "timezone", None) or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def user_now(user) -> datetime:
    """Current moment as an aware datetime in the user's timezone."""
    return timezone.now().astimezone(get_user_tz(user))


def user_today(user) -> date:
    """The user's current local calendar date."""
    return user_now(user).date()
