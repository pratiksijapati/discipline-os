from django.db.models import Max
from rest_framework import serializers

from core.time import user_today

from .models import Habit

DEFAULT_UNITS = {Habit.Type.DURATION: "min"}


class HabitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habit
        fields = (
            "id",
            "name",
            "description",
            "category",
            "habit_type",
            "target_value",
            "unit",
            "frequency",
            "days_of_week",
            "weekly_target",
            "points",
            "start_date",
            "is_active",
            "position",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "position", "created_at", "updated_at")
        extra_kwargs = {"start_date": {"required": False}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the habit a name.")
        return value

    def validate_days_of_week(self, value):
        if not isinstance(value, list) or any(
            not isinstance(d, int) or isinstance(d, bool) or not 0 <= d <= 6 for d in value
        ):
            raise serializers.ValidationError("Use day numbers 0 (Monday) to 6 (Sunday).")
        return sorted(set(value))

    def validate(self, attrs):
        get = lambda name: attrs.get(name, getattr(self.instance, name, None))  # noqa: E731
        habit_type = get("habit_type") or Habit.Type.BOOLEAN
        frequency = get("frequency") or Habit.Frequency.DAILY
        errors = {}

        if habit_type == Habit.Type.BOOLEAN:
            attrs["target_value"] = 1
            attrs["unit"] = ""
        elif not (get("unit") or "").strip():
            if habit_type in DEFAULT_UNITS:
                attrs["unit"] = DEFAULT_UNITS[habit_type]
            else:
                errors["unit"] = ["Add a unit, e.g. glasses or pages."]

        if frequency == Habit.Frequency.SELECTED_DAYS and not get("days_of_week"):
            errors["days_of_week"] = ["Pick at least one day."]
        if frequency == Habit.Frequency.WEEKLY_TARGET and not get("weekly_target"):
            errors["weekly_target"] = ["How many times per week?"]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data.setdefault("start_date", user_today(user))
        last = Habit.objects.filter(user=user).aggregate(m=Max("position"))["m"]
        validated_data["position"] = (last or 0) + 1
        return super().create(validated_data)


def serialize_card(card: dict, context: dict) -> dict:
    """A habit's fields plus today's progress, for habit cards."""
    return {
        **HabitSerializer(card["habit"], context=context).data,
        "value": card["value"],
        "completed": card["completed"],
        "due_today": card["due_today"],
        "streak": card["streak"],
        "week": card["week"],
        "week_count": card["week_count"],
    }


class HabitLogInputSerializer(serializers.Serializer):
    value = serializers.IntegerField(min_value=0, max_value=100_000)
    date = serializers.DateField(required=False)

    def validate_date(self, value):
        if value > user_today(self.context["request"].user):
            raise serializers.ValidationError("You can't log a future day.")
        return value


class ReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, max_length=500)
