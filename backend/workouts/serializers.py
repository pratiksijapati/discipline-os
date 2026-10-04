from django.db import transaction
from rest_framework import serializers

from .models import Exercise, Measure, PlanExercise, SessionExercise, WorkoutPlan, WorkoutSession, WorkoutSet
from .services import active_seconds, session_totals, targets_from


def _check_days(value):
    if not isinstance(value, list) or any(not isinstance(d, int) or isinstance(d, bool) or not 0 <= d <= 6 for d in value):
        raise serializers.ValidationError("Use day numbers 0 (Monday) to 6 (Sunday).")
    return sorted(set(value))


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = (
            "id",
            "name",
            "category",
            "measure",
            "instructions",
            "default_sets",
            "default_reps",
            "default_duration_seconds",
            "default_weight_kg",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the exercise a name.")
        clash = Exercise.objects.filter(user=self.context["request"].user, name__iexact=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("You already have an exercise with this name.")
        return value


# ---------- plans ----------


class PlanExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    measure = serializers.CharField(source="exercise.measure", read_only=True)

    class Meta:
        model = PlanExercise
        fields = (
            "id",
            "exercise",
            "exercise_name",
            "measure",
            "position",
            "target_sets",
            "target_reps",
            "target_duration_seconds",
            "target_weight_kg",
            "rest_seconds",
        )
        read_only_fields = ("id", "position")

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            fields["exercise"].queryset = Exercise.objects.filter(user=request.user)
        return fields


class WorkoutPlanSerializer(serializers.ModelSerializer):
    """Exercises are written as a full list: sending them replaces the plan's exercises in order."""

    exercises = PlanExerciseSerializer(many=True, required=False)

    class Meta:
        model = WorkoutPlan
        fields = ("id", "name", "description", "days_of_week", "is_active", "exercises", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the plan a name.")
        return value

    def validate_days_of_week(self, value):
        return _check_days(value)

    def validate(self, attrs):
        if self.instance is None and not attrs.get("exercises"):
            raise serializers.ValidationError({"exercises": ["Add at least one exercise."]})
        return attrs

    def _write_exercises(self, plan, rows):
        plan.exercises.all().delete()
        objects = []
        for position, row in enumerate(rows, start=1):
            exercise = row["exercise"]
            defaults = targets_from(exercise)
            values = {key: row.get(key, defaults.get(key)) for key in defaults}
            if values["target_sets"] is None:
                values["target_sets"] = exercise.default_sets
            objects.append(
                PlanExercise(
                    plan=plan,
                    exercise=exercise,
                    position=position,
                    rest_seconds=row.get("rest_seconds", 60),
                    **values,
                )
            )
        PlanExercise.objects.bulk_create(objects)

    @transaction.atomic
    def create(self, validated_data):
        rows = validated_data.pop("exercises", [])
        plan = WorkoutPlan.objects.create(**validated_data)
        self._write_exercises(plan, rows)
        return plan

    @transaction.atomic
    def update(self, instance, validated_data):
        rows = validated_data.pop("exercises", None)
        instance = super().update(instance, validated_data)
        if rows is not None:
            if not rows:
                raise serializers.ValidationError({"exercises": ["Add at least one exercise."]})
            self._write_exercises(instance, rows)
        return instance


# ---------- sessions ----------


class WorkoutSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutSet
        fields = ("id", "session_exercise", "set_number", "reps", "weight_kg", "duration_seconds", "completed_at")
        read_only_fields = ("id", "set_number", "completed_at")
        extra_kwargs = {
            "reps": {"min_value": 0, "max_value": 1000},
            "weight_kg": {"min_value": 0, "max_value": 2000},
            "duration_seconds": {"min_value": 0, "max_value": 24 * 3600},
        }

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            fields["session_exercise"].queryset = SessionExercise.objects.filter(session__user=request.user)
        if self.instance is not None:
            fields["session_exercise"].read_only = True
        return fields

    def validate(self, attrs):
        row = attrs.get("session_exercise") or getattr(self.instance, "session_exercise", None)
        reps = attrs.get("reps", getattr(self.instance, "reps", None))
        duration = attrs.get("duration_seconds", getattr(self.instance, "duration_seconds", None))
        if row and row.exercise.measure == Measure.TIME and not duration:
            raise serializers.ValidationError({"duration_seconds": ["How many seconds?"]})
        if row and row.exercise.measure == Measure.REPS and not reps:
            raise serializers.ValidationError({"reps": ["How many reps?"]})
        return attrs


class SessionExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source="exercise.name", read_only=True)
    measure = serializers.CharField(source="exercise.measure", read_only=True)
    instructions = serializers.CharField(source="exercise.instructions", read_only=True)
    sets = WorkoutSetSerializer(many=True, read_only=True)

    class Meta:
        model = SessionExercise
        fields = (
            "id",
            "exercise",
            "exercise_name",
            "measure",
            "instructions",
            "position",
            "target_sets",
            "target_reps",
            "target_duration_seconds",
            "target_weight_kg",
            "sets",
        )


class WorkoutSessionSerializer(serializers.ModelSerializer):
    """Full session for the live screen and the detail/summary view."""

    exercises = SessionExerciseSerializer(many=True, read_only=True)
    active_seconds = serializers.SerializerMethodField()
    totals = serializers.SerializerMethodField()

    class Meta:
        model = WorkoutSession
        fields = (
            "id",
            "plan",
            "name",
            "date",
            "status",
            "started_at",
            "completed_at",
            "paused_at",
            "paused_seconds",
            "duration_seconds",
            "active_seconds",
            "notes",
            "exercises",
            "totals",
        )
        read_only_fields = fields

    def get_active_seconds(self, session):
        return active_seconds(session)

    def get_totals(self, session):
        return session_totals(session)


class WorkoutSessionListSerializer(serializers.ModelSerializer):
    """Light row for history lists."""

    exercise_count = serializers.IntegerField(read_only=True)
    set_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkoutSession
        fields = ("id", "name", "date", "status", "started_at", "duration_seconds", "exercise_count", "set_count")
        read_only_fields = fields


class StartSessionSerializer(serializers.Serializer):
    plan = serializers.PrimaryKeyRelatedField(queryset=WorkoutPlan.objects.none(), required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def get_fields(self):
        fields = super().get_fields()
        fields["plan"].queryset = WorkoutPlan.objects.filter(user=self.context["request"].user)
        return fields


class AddExerciseSerializer(serializers.Serializer):
    exercise = serializers.PrimaryKeyRelatedField(queryset=Exercise.objects.none())

    def get_fields(self):
        fields = super().get_fields()
        fields["exercise"].queryset = Exercise.objects.filter(user=self.context["request"].user)
        return fields
