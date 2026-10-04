from django.db import models


class Priority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class ChallengeType(models.TextChoices):
    """Wake-up challenge types. Movement types use the camera motion detector."""

    DANCE = "dance", "Dance"
    JUMPING_JACKS = "jumping_jacks", "Jumping jacks"
    SQUATS = "squats", "Squats"
    MATH = "math", "Math"


# Used to sort lists: critical first.
PRIORITY_RANK = {Priority.CRITICAL: 0, Priority.HIGH: 1, Priority.MEDIUM: 2, Priority.LOW: 3}
