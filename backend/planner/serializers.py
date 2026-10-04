from rest_framework import serializers

from core.serializers import CompletionStampMixin, check_time_range
from core.time import user_now, user_today

from .models import ScheduleItem, ScheduleTemplate
from .status import display_status

TEMPLATE_CONTENT_FIELDS = set(ScheduleItem.COPIED_FIELDS) | {"date"}


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleTemplate
        fields = (
            "id",
            "title",
            "description",
            "category",
            "priority",
            "start_time",
            "end_time",
            "reminder_minutes",
            "notes",
            "repeat",
            "days_of_week",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {"start_date": {"required": False}}

    def validate_days_of_week(self, value):
        if not isinstance(value, list) or any(not isinstance(d, int) or isinstance(d, bool) for d in value):
            raise serializers.ValidationError("Use a list of day numbers (Monday=0 … Sunday=6).")
        if any(d < 0 or d > 6 for d in value):
            raise serializers.ValidationError("Day numbers must be between 0 (Monday) and 6 (Sunday).")
        return sorted(set(value))

    def validate(self, attrs):
        current = {**self._instance_values(), **attrs}
        errors = {}
        if current.get("repeat") == ScheduleTemplate.Repeat.SELECTED_DAYS and not current.get("days_of_week"):
            errors["days_of_week"] = ["Pick at least one day."]
        if time_error := check_time_range(current.get("start_time"), current.get("end_time")):
            errors.update(time_error)
        if current.get("start_date") and current.get("end_date") and current["end_date"] < current["start_date"]:
            errors["end_date"] = ["End date can't be before the start date."]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def _instance_values(self):
        if not self.instance:
            return {}
        names = ("repeat", "days_of_week", "start_time", "end_time", "start_date", "end_date")
        return {name: getattr(self.instance, name) for name in names}

    def create(self, validated_data):
        validated_data.setdefault("start_date", user_today(self.context["request"].user))
        return super().create(validated_data)


class ScheduleItemSerializer(CompletionStampMixin, serializers.ModelSerializer):
    display_status = serializers.SerializerMethodField()
    is_recurring = serializers.SerializerMethodField()
    template_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = ScheduleItem
        fields = (
            "id",
            "template_id",
            "is_recurring",
            "date",
            "occurrence_date",
            "title",
            "description",
            "category",
            "priority",
            "start_time",
            "end_time",
            "reminder_minutes",
            "notes",
            "status",
            "display_status",
            "completed_at",
            "is_customized",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "occurrence_date",
            "completed_at",
            "is_customized",
            "created_at",
            "updated_at",
        )

    def _clock(self):
        """(today, now_time) in the user's timezone, computed once per request."""
        if "today" not in self.context:
            now = user_now(self.context["request"].user)
            self.context["today"] = now.date()
            self.context["now_time"] = now.time().replace(tzinfo=None)
        return self.context["today"], self.context["now_time"]

    def get_display_status(self, item):
        return display_status(item, *self._clock())

    def get_is_recurring(self, item):
        return item.template_id is not None

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if time_error := check_time_range(start, end):
            raise serializers.ValidationError(time_error)
        return self.stamp_completion(attrs)

    def create(self, validated_data):
        validated_data["occurrence_date"] = validated_data["date"]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if instance.template_id and any(
            name in TEMPLATE_CONTENT_FIELDS and getattr(instance, name) != value
            for name, value in validated_data.items()
        ):
            validated_data["is_customized"] = True
        return super().update(instance, validated_data)
