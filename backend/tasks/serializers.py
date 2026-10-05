from django.utils import timezone
from rest_framework import serializers

from core.serializers import CompletionStampMixin
from core.time import user_today

from .models import DailyFocus, Task


class TaskSerializer(CompletionStampMixin, serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "due_date",
            "due_time",
            "priority",
            "category",
            "status",
            "points",
            "notes",
            "is_overdue",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "completed_at", "created_at", "updated_at")
        extra_kwargs = {"points": {"required": False}}

    def _today(self):
        if "today" not in self.context:
            self.context["today"] = user_today(self.context["request"].user)
        return self.context["today"]

    def get_is_overdue(self, task):
        return task.is_open and task.due_date is not None and task.due_date < self._today()

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the task a title.")
        return value

    def validate(self, attrs):
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        due_time = attrs.get("due_time", getattr(self.instance, "due_time", None))
        if due_time and not due_date:
            raise serializers.ValidationError({"due_time": ["Pick a due date to set a time."]})
        return self.stamp_completion(attrs)

    def create(self, validated_data):
        if "points" not in validated_data:
            validated_data["points"] = Task.DEFAULT_POINTS.get(validated_data.get("priority", "medium"), 2)
        return super().create(validated_data)


class DailyFocusSerializer(serializers.ModelSerializer):
    """`date` defaults to the user's today. Ticking `completed` stamps `completed_at`."""

    date = serializers.DateField(required=False)

    class Meta:
        model = DailyFocus
        fields = ("id", "date", "title", "completed", "completed_at", "created_at", "updated_at")
        read_only_fields = ("id", "completed_at", "created_at", "updated_at")

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Write what you want to get done.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None:
            attrs.setdefault("date", user_today(user))
        day = attrs.get("date", getattr(self.instance, "date", None))
        taken = DailyFocus.objects.filter(user=user, date=day)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.pk)
        if taken.exists():
            raise serializers.ValidationError({"date": ["There's already a focus for this day — edit it instead."]})
        if "completed" in attrs:
            was_done = bool(self.instance and self.instance.completed)
            if attrs["completed"] and not was_done:
                attrs["completed_at"] = timezone.now()
            elif not attrs["completed"]:
                attrs["completed_at"] = None
        return attrs
