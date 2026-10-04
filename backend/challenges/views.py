from datetime import datetime, timedelta

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.mixins import OwnedQuerysetMixin
from core.time import user_now
from discipline import engine
from discipline.services import build_today
from users.models import UserSettings

from . import services
from .models import WakeChallengeSession
from .serializers import CompleteSerializer, StartSerializer, WakeSessionSerializer


def _wake_streak(user) -> dict:
    snap = build_today(user)
    engine.finalize_past_days(user, snap.day)
    today_score = engine.save_score(user, snap.day, snap, final=False)
    return engine.streaks(user, snap.day, today_score)["wake_up"]


class WakeTodayView(APIView):
    """GET /api/wake/today/ — the challenge setup for this morning and whether it's done."""

    def get(self, request):
        settings = UserSettings.for_user(request.user)
        now = user_now(request.user)
        deadline = datetime.combine(now.date(), settings.wake_time) + timedelta(minutes=settings.wake_grace_minutes)
        done = services.completed_today(request.user)
        return Response(
            {
                "date": now.date().isoformat(),
                "now": now.isoformat(),
                "wake_time": settings.wake_time.strftime("%H:%M"),
                "deadline": deadline.time().strftime("%H:%M"),
                "challenge": {
                    "enabled": settings.wake_challenge_enabled,
                    "type": settings.wake_challenge_type,
                    "seconds": settings.wake_challenge_seconds,
                },
                "completed": WakeSessionSerializer(done).data if done else None,
                "streak": _wake_streak(request.user),
            }
        )


class WakeSessionViewSet(OwnedQuerysetMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    POST /api/wake/sessions/                 {challenge_type?, method}  start an attempt
    POST /api/wake/sessions/{id}/complete/   {active_seconds} or {answers: [...]}
    """

    queryset = WakeChallengeSession.objects.all()
    serializer_class = WakeSessionSerializer

    def create(self, request):
        payload = StartSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        challenge_type = payload.validated_data.get("challenge_type") or UserSettings.for_user(request.user).wake_challenge_type
        session = services.start(request.user, challenge_type, payload.validated_data["method"])
        return Response(self.get_serializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        payload = CompleteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        session = services.complete(
            self.get_object(),
            active_seconds=payload.validated_data["active_seconds"],
            answers=payload.validated_data.get("answers"),
        )
        return Response({**self.get_serializer(session).data, "streak": _wake_streak(request.user)})
