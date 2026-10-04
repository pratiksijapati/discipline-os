from rest_framework import serializers

from .models import NotificationPreference


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            "enabled",
            "schedule_reminders",
            "workout_reminder",
            "workout_lead_minutes",
            "wake_up",
            "tasks",
            "tasks_time",
            "habits",
            "habits_time",
            "night_review",
            "night_review_time",
            "goal_deadlines",
            "goal_deadlines_time",
        )
        extra_kwargs = {"workout_lead_minutes": {"min_value": 0, "max_value": 120}}


class SubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=200)
    auth = serializers.CharField(max_length=100)


class SubscriptionSerializer(serializers.Serializer):
    """The PushSubscription JSON a browser produces: {endpoint, keys: {p256dh, auth}}."""

    endpoint = serializers.URLField(max_length=1000)
    keys = SubscriptionKeysSerializer()

    def validate_endpoint(self, value):
        if not value.startswith("https://"):
            raise serializers.ValidationError("Push endpoints must use HTTPS.")
        return value


class UnsubscribeSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=1000)
