from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User, UserSettings, normalize_login_email


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = (
            "theme",
            "week_start",
            "weekly_workout_target",
            "wake_time",
            "wake_grace_minutes",
            "score_weights",
            "streak_threshold",
            "daily_target_score",
            "wake_challenge_enabled",
            "wake_challenge_type",
            "wake_challenge_seconds",
            "onboarding_completed",
            "updated_at",
        )
        read_only_fields = ("updated_at",)

    @staticmethod
    def _default_weights() -> dict:
        # Imported lazily: the scoring engine depends on this app, not the other way round.
        from discipline.scoring import DEFAULT_WEIGHTS

        return DEFAULT_WEIGHTS

    def validate_score_weights(self, value):
        defaults = self._default_weights()
        if not isinstance(value, dict):
            raise serializers.ValidationError("Send points per component, e.g. {\"workout\": 20}.")
        unknown = set(value) - set(defaults)
        if unknown:
            raise serializers.ValidationError(f"Unknown components: {', '.join(sorted(unknown))}.")
        for key, points in value.items():
            if not isinstance(points, int) or isinstance(points, bool) or not 0 <= points <= 100:
                raise serializers.ValidationError(f"{key}: use a whole number from 0 to 100.")
        merged = {**defaults, **value}
        if sum(merged.values()) == 0:
            raise serializers.ValidationError("At least one component needs points.")
        return merged

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["score_weights"] = {**self._default_weights(), **(instance.score_weights or {})}
        return data


class UserSerializer(serializers.ModelSerializer):
    """The current user's profile. Email is the login identity, so it is read-only here."""

    settings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "timezone", "settings", "created_at", "updated_at")
        read_only_fields = ("id", "email", "created_at", "updated_at")

    def get_settings(self, user):
        return UserSettingsSerializer(UserSettings.for_user(user)).data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "timezone")
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": False},
            "timezone": {"required": False},
        }

    def validate_email(self, value):
        email = normalize_login_email(value)
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate(self, attrs):
        # Run Django's password rules (length, common, similar to name/email…).
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            password_validation.validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        UserSettings.for_user(user)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": ["New password must be different."]})
        try:
            password_validation.validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs
