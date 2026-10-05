from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_today

from .models import DailyFocus, Task
from .selectors import filter_view
from .serializers import DailyFocusSerializer, TaskSerializer


class TaskViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    GET /api/tasks/?view=today|upcoming|someday|completed
    Open-task views are naturally small, so the list isn't paginated;
    "completed" returns the 100 most recent.
    """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    pagination_class = None

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.user.is_authenticated:
            context["today"] = user_today(self.request.user)
        return context

    def filter_queryset(self, queryset):
        if self.action != "list":
            return queryset
        return filter_view(queryset, self.request.query_params.get("view", "all"), user_today(self.request.user))


class DailyFocusViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    GET    /api/daily-focus/today/   today's focus, or null
    POST   /api/daily-focus/         {title, date?}  — one per day
    PATCH  /api/daily-focus/{id}/    {title?, completed?}
    DELETE /api/daily-focus/{id}/    clear it
    GET    /api/daily-focus/         the last 30
    """

    queryset = DailyFocus.objects.all()
    serializer_class = DailyFocusSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset[:30] if self.action == "list" else queryset

    @action(detail=False, methods=["get"])
    def today(self, request):
        focus = self.get_queryset().filter(date=user_today(request.user)).first()
        return Response(self.get_serializer(focus).data if focus else None)
