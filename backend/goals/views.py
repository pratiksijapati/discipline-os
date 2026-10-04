from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_today

from .models import Goal, GoalProgress
from .serializers import GoalProgressSerializer, GoalSerializer, LogProgressSerializer
from .services import log_progress, make_main, undo_progress

PROGRESS_HISTORY_LIMIT = 50


class GoalViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    Personal growth goals.
      GET  /api/goals/?status=active|completed     (default: all)
      GET  /api/goals/{id}/progress/               recent progress entries
      POST /api/goals/{id}/progress/               {amount, mode: add|set, note?, date?}
      POST /api/goals/{id}/main/                   pin as Today's main goal (again to unpin)
    """

    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    pagination_class = None

    def filter_queryset(self, queryset):
        if self.action != "list":
            return queryset
        wanted = self.request.query_params.get("status")
        if wanted == "active":
            return queryset.exclude(status=Goal.Status.COMPLETED)
        if wanted == "completed":
            return queryset.filter(status=Goal.Status.COMPLETED).order_by("-completed_at")
        return queryset

    @action(detail=True, methods=["get", "post"])
    def progress(self, request, pk=None):
        goal = self.get_object()
        if request.method == "GET":
            entries = goal.progress.all()[:PROGRESS_HISTORY_LIMIT]
            return Response(GoalProgressSerializer(entries, many=True).data)

        payload = LogProgressSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        data = payload.validated_data
        log_progress(goal, data["amount"], data["mode"], data.get("date", user_today(request.user)), data.get("note", ""))
        goal.refresh_from_db()
        return Response(self.get_serializer(goal).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def main(self, request, pk=None):
        goal = self.get_object()
        if goal.is_main:
            goal.is_main = False
            goal.save(update_fields=["is_main", "updated_at"])
        else:
            make_main(goal)
        return Response(self.get_serializer(goal).data)


class GoalProgressViewSet(OwnedQuerysetMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """DELETE /api/goal-progress/{id}/ undoes one entry."""

    queryset = GoalProgress.objects.all()
    serializer_class = GoalProgressSerializer

    def destroy(self, request, *args, **kwargs):
        goal = undo_progress(self.get_object())
        return Response(GoalSerializer(goal, context=self.get_serializer_context()).data)
