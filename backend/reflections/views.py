from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin

from .models import DailyReflection
from .serializers import DailyReflectionSerializer
from .services import complete_day, live_day_stats, review_date


class ReflectionViewSet(OwnedQuerysetMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Night Review.
      GET   /api/reflections/current/            the day to review, its draft (or null) and live stats
      PATCH /api/reflections/current/            save draft fields (autosave)
      POST  /api/reflections/current/complete/   Complete Day (needs a day rating)
      GET   /api/reflections/                    past completed reviews (paginated)
    """

    queryset = DailyReflection.objects.all()
    serializer_class = DailyReflectionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(completed_at__isnull=False) if self.action == "list" else qs

    def _current(self, create=False):
        day = review_date(self.request.user)
        if create:
            obj, _ = DailyReflection.objects.get_or_create(user=self.request.user, date=day)
            return day, obj
        return day, DailyReflection.objects.filter(user=self.request.user, date=day).first()

    def _payload(self, day, reflection):
        return {
            "date": day.isoformat(),
            "reflection": self.get_serializer(reflection).data if reflection else None,
            "stats": reflection.stats if reflection and reflection.is_completed else live_day_stats(self.request.user, day),
        }

    @action(detail=False, methods=["get", "patch"])
    def current(self, request):
        if request.method == "GET":
            return Response(self._payload(*self._current()))
        day, reflection = self._current(create=True)
        serializer = self.get_serializer(reflection, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self._payload(day, reflection))

    @action(detail=False, methods=["post"], url_path="current/complete")
    def complete(self, request):
        day, reflection = self._current(create=True)
        serializer = self.get_serializer(reflection, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if not reflection.day_rating:
            raise ValidationError({"day_rating": ["How was your day? Pick one."]})
        complete_day(reflection)
        return Response(self._payload(day, reflection))
