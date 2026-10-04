from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_today

from .models import Habit
from .serializers import HabitLogInputSerializer, HabitSerializer, ReorderSerializer, serialize_card
from .services import build_cards, set_log_value


class HabitViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    CRUD for habits, plus:
      GET  /api/habits/today/        cards for every active habit (value, streak, week strip)
      POST /api/habits/{id}/log/     {value, date?} — set the day's value (0 clears it)
      POST /api/habits/reorder/      {ids: [...]}
    Archive a habit with PATCH is_active=false; its history is kept.
    """

    queryset = Habit.objects.all()
    serializer_class = HabitSerializer
    pagination_class = None

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = user_today(request.user)
        cards = build_cards(request.user, today)
        context = self.get_serializer_context()
        return Response({"date": today.isoformat(), "habits": [serialize_card(c, context) for c in cards]})

    @action(detail=True, methods=["post"])
    def log(self, request, pk=None):
        habit = self.get_object()
        payload = HabitLogInputSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        today = user_today(request.user)
        set_log_value(habit, payload.validated_data.get("date", today), payload.validated_data["value"])
        card = build_cards(request.user, today, habits=[habit])[0]
        return Response(serialize_card(card, self.get_serializer_context()))

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        payload = ReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ids = payload.validated_data["ids"]
        habits = {h.id: h for h in self.get_queryset().filter(id__in=ids)}
        with transaction.atomic():
            for position, habit_id in enumerate(ids, start=1):
                if habit_id in habits:
                    habits[habit_id].position = position
            Habit.objects.bulk_update(habits.values(), ["position"])
        return Response(status=status.HTTP_204_NO_CONTENT)
