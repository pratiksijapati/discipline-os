from rest_framework import serializers

from .models import ChallengeType, WakeChallengeSession


class WakeSessionSerializer(serializers.ModelSerializer):
    """Math answers are never sent to the browser — only the problem text."""

    problems = serializers.SerializerMethodField()

    class Meta:
        model = WakeChallengeSession
        fields = (
            "id",
            "date",
            "challenge_type",
            "method",
            "target_seconds",
            "active_seconds",
            "status",
            "started_at",
            "completed_at",
            "problems",
        )
        read_only_fields = fields

    def get_problems(self, session):
        return [p["text"] for p in session.details.get("problems", [])]


class StartSerializer(serializers.Serializer):
    challenge_type = serializers.ChoiceField(choices=ChallengeType.choices, required=False)
    method = serializers.ChoiceField(choices=WakeChallengeSession.Method.choices, default=WakeChallengeSession.Method.CAMERA)


class CompleteSerializer(serializers.Serializer):
    active_seconds = serializers.IntegerField(min_value=0, max_value=3600, default=0)
    answers = serializers.ListField(child=serializers.IntegerField(), required=False, max_length=10)
