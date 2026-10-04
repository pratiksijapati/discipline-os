from datetime import date, timedelta

from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_now, user_today

from .models import Routine, RoutineItem, ScheduleItem, ScheduleTemplate
from .routines import default_routine, make_default, progress_for_day, set_item_done
from .serializers import (
    ItemOrderSerializer,
    RoutineCheckSerializer,
    RoutineItemSerializer,
    RoutineSerializer,
    ScheduleItemSerializer,
    ScheduleTemplateSerializer,
)
from .services import MAX_RANGE_DAYS, delete_template, ensure_occurrences, refresh_future_occurrences


def _parse_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError({field: ["Use the format YYYY-MM-DD."]})


def parse_date_range(params, today: date) -> tuple[date, date]:
    """?date=YYYY-MM-DD, or ?start=…&end=…, default today."""
    if "date" in params:
        day = _parse_date(params["date"], "date")
        return day, day
    start = _parse_date(params["start"], "start") if "start" in params else today
    end = _parse_date(params["end"], "end") if "end" in params else start
    if end < start:
        raise serializers.ValidationError({"end": ["End must be on or after start."]})
    if (end - start) > timedelta(days=MAX_RANGE_DAYS):
        raise serializers.ValidationError({"end": [f"Ask for at most {MAX_RANGE_DAYS} days at once."]})
    return start, end


class ScheduleTemplateViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """Recurring schedule rules."""

    queryset = ScheduleTemplate.objects.all()
    serializer_class = ScheduleTemplateSerializer
    pagination_class = None

    def perform_update(self, serializer):
        template = serializer.save()
        refresh_future_occurrences(template, user_today(self.request.user))

    def perform_destroy(self, instance):
        delete_template(instance, user_today(self.request.user))


class ScheduleItemViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    Concrete schedule entries. Listing a date range first creates any recurring
    occurrences for those days, so the client always sees the full plan.
    """

    queryset = ScheduleItem.objects.filter(is_removed=False)
    serializer_class = ScheduleItemSerializer
    pagination_class = None

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.user.is_authenticated:
            now = user_now(self.request.user)
            context["today"] = now.date()
            context["now_time"] = now.time().replace(tzinfo=None)
        return context

    def list(self, request, *args, **kwargs):
        start, end = parse_date_range(request.query_params, user_today(request.user))
        ensure_occurrences(request.user, start, end)
        items = self.get_queryset().filter(date__range=(start, end))
        return Response(self.get_serializer(items, many=True).data)

    def perform_destroy(self, instance):
        if instance.template_id:
            # Keep a hidden marker so the recurring rule doesn't bring it back.
            instance.is_removed = True
            instance.save(update_fields=["is_removed", "updated_at"])
        else:
            instance.delete()


class RoutineViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """
    Routines (checklists). Extra endpoints:
      GET  /api/routines/today/?routine=<id>    today's checklist for the default (or given) routine
      POST /api/routines/{id}/reorder/          {item_ids: [...]}
    """

    queryset = Routine.objects.prefetch_related("items")
    serializer_class = RoutineSerializer
    pagination_class = None

    def perform_create(self, serializer):
        wants_default = serializer.validated_data.get("is_default", False)
        is_first = not Routine.objects.filter(user=self.request.user).exists()
        routine = serializer.save(user=self.request.user)
        if wants_default or is_first:
            make_default(routine)

    def perform_update(self, serializer):
        routine = serializer.save()
        if serializer.initial_data.get("is_default") is True:
            make_default(routine)

    @action(detail=False, methods=["get"])
    def today(self, request):
        routine_id = request.query_params.get("routine")
        if routine_id:
            routine = self.get_queryset().filter(pk=routine_id).first()
            if routine is None:
                raise serializers.ValidationError({"routine": ["Routine not found."]})
        else:
            routine = default_routine(request.user)
        return Response(progress_for_day(routine, user_today(request.user)))

    @action(detail=True, methods=["post"])
    def reorder(self, request, pk=None):
        routine = self.get_object()
        payload = ItemOrderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        items = {item.id: item for item in routine.items.all()}
        with transaction.atomic():
            for position, item_id in enumerate(payload.validated_data["item_ids"], start=1):
                if item_id in items:
                    items[item_id].position = position
            RoutineItem.objects.bulk_update(items.values(), ["position"])
        fresh = self.get_queryset().get(pk=routine.pk)  # re-read so items come back in the new order
        return Response(RoutineSerializer(fresh, context=self.get_serializer_context()).data)

    def perform_destroy(self, instance):
        was_default = instance.is_default
        user = instance.user
        instance.delete()
        if was_default and (next_routine := default_routine(user)):
            make_default(next_routine)


class RoutineItemViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    """Steps of a routine. POST /api/routine-items/{id}/check/ {done, date?} ticks one off."""

    queryset = RoutineItem.objects.select_related("routine")
    serializer_class = RoutineItemSerializer
    pagination_class = None
    owner_field = "routine__user"

    def perform_create(self, serializer):
        # Ownership is enforced by the serializer's routine queryset.
        serializer.save()

    @action(detail=True, methods=["post"], url_path="check", url_name="check")
    def check_off(self, request, pk=None):
        item = self.get_object()
        payload = RoutineCheckSerializer(data=request.data, context={"request": request})
        payload.is_valid(raise_exception=True)
        today = user_today(request.user)
        set_item_done(item, payload.validated_data.get("date", today), payload.validated_data["done"])
        return Response(progress_for_day(item.routine, payload.validated_data.get("date", today)))
