"""Helpers shared by app test suites."""

from contextlib import contextmanager
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.core.cache import cache
from rest_framework.test import APITestCase

from users.models import User

KATHMANDU = ZoneInfo("Asia/Kathmandu")


@contextmanager
def frozen_local_time(year, month, day, hour=12, minute=0):
    """Pretend 'now' is the given Kathmandu wall-clock time."""
    moment = datetime(year, month, day, hour, minute, tzinfo=KATHMANDU)
    with patch("core.time.timezone.now", return_value=moment):
        yield moment


class AuthedAPITestCase(APITestCase):
    password = "Steady-Morning-42"

    def setUp(self):
        cache.clear()
        self.user = self.make_user("me@example.com")
        self.other = self.make_user("other@example.com")
        self.client.force_authenticate(self.user)

    def make_user(self, email):
        return User.objects.create_user(email=email, password=self.password, first_name=email.split("@")[0])
