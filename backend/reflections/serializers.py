from rest_framework import serializers

from .models import DailyReflection


class DailyReflectionSerializer(serializers.ModelSerializer):
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = DailyReflection
        fields = (
            "id",
            "date",
            "day_rating",
            "went_well",
            "improve",
            "grateful",
            "energy",
            "mood",
            "is_completed",
            "completed_at",
            "stats",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "date", "is_completed", "completed_at", "stats", "created_at", "updated_at")
