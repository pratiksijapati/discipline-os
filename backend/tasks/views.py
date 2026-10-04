from rest_framework import viewsets

from core.mixins import OwnedQuerysetMixin
from core.time import user_today

from .models import Task
from .selectors import filter_view
from .serializers import TaskSerializer


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
