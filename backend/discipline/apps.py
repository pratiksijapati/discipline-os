from django.apps import AppConfig


class DisciplineConfig(AppConfig):
    """Dashboard now; daily score, streaks and analytics in later phases."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "discipline"
