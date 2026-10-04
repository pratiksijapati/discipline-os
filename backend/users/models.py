from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from core.models import TimeStampedModel
from core.time import DEFAULT_TIMEZONE, validate_timezone


def normalize_login_email(email: str) -> str:
    """Emails are stored lowercase so 'Me@Mail.com' and 'me@mail.com' are one account."""
    return email.strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_by_natural_key(self, email):
        # Login is case-insensitive because emails are always stored lowercase.
        return self.get(**{self.model.USERNAME_FIELD: normalize_login_email(email)})

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=normalize_login_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields["is_staff"] is not True or extra_fields["is_superuser"] is not True:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Logs in with email. Every personal record in the system points to a User."""

    email = models.EmailField("email address", unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    timezone = models.CharField(max_length=64, default=DEFAULT_TIMEZONE, validators=[validate_timezone])
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    EMAIL_FIELD = "email"
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if self.email:
            self.email = normalize_login_email(self.email)
        super().save(*args, **kwargs)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name


class UserSettings(TimeStampedModel):
    """
    Per-user preferences. Created automatically the first time they are read.
    More fields (wake-up time, scoring weights, workout target…) are added in their phases.
    """

    class Theme(models.TextChoices):
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"
        SYSTEM = "system", "System"

    class WeekStart(models.IntegerChoices):
        # Matches Python's date.weekday(): Monday=0 … Sunday=6
        MONDAY = 0, "Monday"
        SUNDAY = 6, "Sunday"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="settings")
    theme = models.CharField(max_length=10, choices=Theme.choices, default=Theme.SYSTEM)
    week_start = models.PositiveSmallIntegerField(choices=WeekStart.choices, default=WeekStart.SUNDAY)

    class Meta:
        verbose_name = "user settings"
        verbose_name_plural = "user settings"

    def __str__(self):
        return f"Settings for {self.user}"

    @classmethod
    def for_user(cls, user) -> "UserSettings":
        obj, _ = cls.objects.get_or_create(user=user)
        return obj
