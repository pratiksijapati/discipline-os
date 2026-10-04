from decimal import Decimal

from rest_framework import serializers

from core.time import user_today

from .models import Goal, GoalProgress
from .services import sync_status

DEFAULT_UNITS = {
    Goal.Measure.CURRENCY: "NPR",
    Goal.Measure.DURATION: "h",
    Goal.Measure.PERCENTAGE: "%",
}


class GoalSerializer(serializers.ModelSerializer):
    progress_pct = serializers.IntegerField(read_only=True)
    days_left = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = (
            "id",
            "title",
            "description",
            "category",
            "measure",
            "target_value",
            "current_value",
            "unit",
            "start_date",
            "deadline",
            "status",
            "priority",
            "is_main",
            "progress_pct",
            "days_left",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_main", "progress_pct", "completed_at", "created_at", "updated_at")
        extra_kwargs = {
            "start_date": {"required": False},
            "target_value": {"required": False},
            "current_value": {"required": False, "min_value": Decimal("0")},
        }

    def _today(self):
        if "today" not in self.context:
            self.context["today"] = user_today(self.context["request"].user)
        return self.context["today"]

    def get_days_left(self, goal):
        if not goal.deadline or goal.status == Goal.Status.COMPLETED:
            return None
        return (goal.deadline - self._today()).days

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the goal a title.")
        return value

    def validate_status(self, value):
        # Completed comes from progress; the user can only pause or un-pause.
        if value == Goal.Status.COMPLETED and (self.instance is None or self.instance.status != Goal.Status.COMPLETED):
            raise serializers.ValidationError("Log progress to complete a goal.")
        return value

    def validate(self, attrs):
        get = lambda name: attrs.get(name, getattr(self.instance, name, None))  # noqa: E731
        measure = get("measure") or Goal.Measure.NUMBER
        errors = {}

        if self.instance is not None and "current_value" in attrs:
            errors["current_value"] = ["Log progress to change the current value."]

        if measure == Goal.Measure.BOOLEAN:
            attrs["target_value"] = Decimal("1")
            attrs["unit"] = ""
        elif measure == Goal.Measure.PERCENTAGE:
            attrs.setdefault("target_value", Decimal("100"))
            attrs["unit"] = "%"
        elif not (get("unit") or "").strip():
            if measure in DEFAULT_UNITS:
                attrs["unit"] = DEFAULT_UNITS[measure]

        target = get("target_value")
        if target is None or target <= 0:
            errors["target_value"] = ["Set a target above 0."]

        start, deadline = get("start_date"), get("deadline")
        if start and deadline and deadline < start:
            errors["deadline"] = ["The deadline can't be before the start date."]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        user = validated_data.pop("user", None) or self.context["request"].user
        validated_data.setdefault("start_date", user_today(user))
        goal = Goal(user=user, **validated_data)
        sync_status(goal)
        # The first open goal becomes the main goal shown on Today.
        goal.is_main = not Goal.objects.filter(user=user, is_main=True).exists()
        goal.save()
        return goal

    def update(self, instance, validated_data):
        goal = super().update(instance, validated_data)
        sync_status(goal)
        goal.save()
        return goal


class GoalProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalProgress
        fields = ("id", "goal", "date", "delta", "value_after", "note", "created_at")
        read_only_fields = fields


class LogProgressSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("-1000000000"))
    mode = serializers.ChoiceField(choices=["add", "set"], default="add")
    date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["mode"] == "set" and attrs["amount"] < 0:
            raise serializers.ValidationError({"amount": ["The value can't be negative."]})
        if attrs["mode"] == "add" and attrs["amount"] == 0:
            raise serializers.ValidationError({"amount": ["Enter an amount."]})
        if attrs.get("date") and attrs["date"] > user_today(self.context["request"].user):
            raise serializers.ValidationError({"date": ["You can't log a future day."]})
        return attrs
