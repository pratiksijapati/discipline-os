import hmac

from django.conf import settings
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import reminders
from .models import NotificationPreference, PushSubscription
from .push import is_configured, send_to_user
from .serializers import PreferenceSerializer, SubscriptionSerializer, UnsubscribeSerializer


class PushConfigView(APIView):
    """GET /api/notifications/config/ — the public VAPID key (safe to share) and device count."""

    def get(self, request):
        return Response(
            {
                "configured": is_configured(),
                "public_key": settings.VAPID_PUBLIC_KEY if is_configured() else None,
                "devices": PushSubscription.objects.filter(user=request.user).count(),
            }
        )


class SubscriptionView(APIView):
    """POST to subscribe this browser; DELETE {endpoint} to unsubscribe it."""

    def post(self, request):
        data = SubscriptionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        # The same browser re-subscribing (or a new account on it) takes over the endpoint.
        PushSubscription.objects.update_or_create(
            endpoint=data.validated_data["endpoint"],
            defaults={
                "user": request.user,
                "p256dh": data.validated_data["keys"]["p256dh"],
                "auth": data.validated_data["keys"]["auth"],
                "user_agent": request.headers.get("User-Agent", "")[:300],
            },
        )
        return Response({"devices": PushSubscription.objects.filter(user=request.user).count()}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        data = UnsubscribeSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        PushSubscription.objects.filter(user=request.user, endpoint=data.validated_data["endpoint"]).delete()
        return Response({"devices": PushSubscription.objects.filter(user=request.user).count()})


class PreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = PreferenceSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return NotificationPreference.for_user(self.request.user)


class TestNotificationView(APIView):
    """
    POST /api/notifications/test/ — sends a test push.
    With {"endpoint": ...} only to that device, so the answer is about *this* device:
    {"delivered": n, "this_device": true|false}. Without it, to all your devices.
    """

    throttle_scope = "auth"

    def post(self, request):
        endpoint = request.data.get("endpoint") or None
        delivered = send_to_user(
            request.user,
            "Reminders are on ✓",
            "This is how Discipline OS will nudge you.",
            "/today",
            tag="test",
            endpoint=endpoint,
        )
        return Response({"delivered": delivered, "this_device": bool(endpoint) and delivered > 0})


class RunRemindersView(APIView):
    """
    POST /api/notifications/run/ with header X-Cron-Secret.
    For hosts without a background worker: an external cron calls this every minute.
    Disabled (404) unless REMINDER_CRON_SECRET is set.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        secret = settings.REMINDER_CRON_SECRET
        given = request.headers.get("X-Cron-Secret", "")
        if not secret or not hmac.compare_digest(secret, given):
            raise NotFound()
        return Response({"sent": reminders.run()})
