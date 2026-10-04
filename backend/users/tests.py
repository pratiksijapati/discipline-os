from datetime import datetime, timezone as dt_timezone
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from core.time import user_today

from .models import User


class UserModelTests(TestCase):
    def test_email_is_login_and_stored_lowercase(self):
        user = User.objects.create_user(email="  Me@Example.COM ", password="Strong-pass-123", first_name="Me")
        self.assertEqual(user.email, "me@example.com")
        self.assertTrue(user.check_password("Strong-pass-123"))
        self.assertEqual(user.timezone, "Asia/Kathmandu")

    def test_create_superuser(self):
        admin = User.objects.create_superuser(email="admin@example.com", password="Strong-pass-123", first_name="A")
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_invalid_timezone_rejected(self):
        user = User(email="tz@example.com", first_name="T", timezone="Mars/Olympus")
        user.set_password("Strong-pass-123")
        with self.assertRaises(ValidationError):
            user.full_clean()


class UserTodayTests(TestCase):
    def test_local_date_differs_from_utc(self):
        # 20:00 UTC on Oct 4 is already 01:45 on Oct 5 in Kathmandu (UTC+5:45).
        user = User(email="t@example.com", first_name="T", timezone="Asia/Kathmandu")
        fake_now = datetime(2026, 10, 4, 20, 0, tzinfo=dt_timezone.utc)
        with patch("core.time.timezone.now", return_value=fake_now):
            self.assertEqual(user_today(user).isoformat(), "2026-10-05")
