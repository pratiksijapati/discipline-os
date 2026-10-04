from django.db.models import Count, ProtectedError, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_today

from . import services
from .models import Exercise, SessionExercise, WorkoutPlan, WorkoutSession, WorkoutSet
from .serializers import (
    AddExerciseSerializer,
    ExerciseSerializer,
    StartSessionSerializer,
    WorkoutPlanSerializer,
    WorkoutSessionListSerializer,
    WorkoutSessionSerializer,
    WorkoutSetSerializer,
)
from .services import targets_from


class ExerciseViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """Exercise library. GET /exercises/{id}/history/ shows past sets for progression."""

    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    pagination_class = None

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError("This exercise is used in a plan or past workout. Archive it instead.")

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        return Response(services.exercise_history(self.get_object()))


class WorkoutPlanViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """Plans with their exercises. POST /workout-plans/starter/ adds ready-made plans."""

    queryset = WorkoutPlan.objects.prefetch_related("exercises__exercise")
    serializer_class = WorkoutPlanSerializer
    pagination_class = None

    @action(detail=False, methods=["post"])
    def starter(self, request):
        services.create_starter_content(request.user)
        plans = self.get_queryset()
        return Response(self.get_serializer(plans, many=True).data, status=status.HTTP_201_CREATED)


class WorkoutSessionViewSet(OwnedQuerysetMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Workout sessions.
      POST /workouts/                     {plan?} start (409 if one is already active)
      GET  /workouts/active/              the active session, or null
      POST /workouts/{id}/pause|resume|complete|cancel/
      POST /workouts/{id}/sets/           {session_exercise, reps, weight_kg, duration_seconds}
      POST /workouts/{id}/exercises/      {exercise} add an exercise mid-workout
      GET  /workouts/stats/
      GET  /workouts/                     history (completed), paginated
    """

    queryset = WorkoutSession.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            return qs.filter(status=WorkoutSession.Status.COMPLETED).annotate(
                exercise_count=Count("exercises", filter=Q(exercises__sets__isnull=False), distinct=True),
                set_count=Count("exercises__sets"),
            )
        return qs.prefetch_related("exercises__exercise", "exercises__sets")

    def get_serializer_class(self):
        return WorkoutSessionListSerializer if self.action == "list" else WorkoutSessionSerializer

    def _respond(self, session, code=status.HTTP_200_OK):
        fresh = self.get_queryset().get(pk=session.pk)
        return Response(WorkoutSessionSerializer(fresh, context=self.get_serializer_context()).data, status=code)

    def create(self, request):
        payload = StartSessionSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        session = services.start_session(
            request.user, plan=payload.validated_data.get("plan"), name=payload.validated_data.get("name", "")
        )
        return self._respond(session, status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        session = services.active_session(request.user)
        return self._respond(session) if session else Response(None)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        return self._respond(services.pause(self.get_object()))

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        return self._respond(services.resume(self.get_object()))

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        notes = request.data.get("notes")
        return self._respond(services.complete(self.get_object(), notes=notes if isinstance(notes, str) else None))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._respond(services.cancel(self.get_object()))

    @action(detail=True, methods=["post"])
    def sets(self, request, pk=None):
        session = self.get_object()
        payload = WorkoutSetSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        row = payload.validated_data.pop("session_exercise")
        if row.session_id != session.id:
            raise ValidationError({"session_exercise": ["That exercise isn't part of this workout."]})
        services.add_set(row, **payload.validated_data)
        return self._respond(session, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def exercises(self, request, pk=None):
        session = self.get_object()
        if not session.is_active:
            raise ValidationError("This workout is already finished.")
        payload = AddExerciseSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        exercise = payload.validated_data["exercise"]
        position = session.exercises.count() + 1
        SessionExercise.objects.create(session=session, exercise=exercise, position=position, **targets_from(exercise))
        return self._respond(session, status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        return Response(services.workout_stats(request.user, user_today(request.user)))


class WorkoutSetViewSet(
    OwnedQuerysetMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """Fix or remove a logged set (only while its workout is active)."""

    queryset = WorkoutSet.objects.select_related("session_exercise__session", "session_exercise__exercise")
    serializer_class = WorkoutSetSerializer
    owner_field = "session_exercise__session__user"

    def _check_active(self, workout_set):
        if not workout_set.session_exercise.session.is_active:
            raise ValidationError("This workout is already finished.")

    def perform_update(self, serializer):
        self._check_active(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_active(instance)
        instance.delete()
