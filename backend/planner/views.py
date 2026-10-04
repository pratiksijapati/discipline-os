from datetime import date, timedelta

from rest_framework import serializers, viewsets
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin
from core.time import user_now, user_today

from .models import ScheduleItem, ScheduleTemplate
from .serializers import ScheduleItemSerializer, ScheduleTemplateSerializer
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
