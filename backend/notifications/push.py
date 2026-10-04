"""Sending Web Push messages (VAPID). Keys come from the environment, never from code."""

import json
import logging

from django.conf import settings
from django.utils import timezone
from py_vapid import Vapid
from pywebpush import WebPushException, webpush

from .models import PushSubscription

logger = logging.getLogger(__name__)

# Push services drop expired subscriptions with these codes.
GONE_STATUSES = {404, 410}


def is_configured() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY and settings.VAPID_SUBJECT)


def _vapid():
    return Vapid.from_raw(settings.VAPID_PRIVATE_KEY.encode())


def send_to_user(user, title: str, body: str, url: str = "/today", tag: str = "") -> int:
    """Send to every device the user subscribed. Returns how many deliveries succeeded."""
    if not is_configured():
        return 0
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag or url})
    delivered = 0
    for sub in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info=sub.as_subscription_info(),
                data=payload,
                vapid_private_key=_vapid(),
                vapid_claims={"sub": settings.VAPID_SUBJECT},
                ttl=60 * 60,
            )
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in GONE_STATUSES:
                sub.delete()  # browser unsubscribed or reinstalled
            else:
                logger.warning("Push to %s failed: %s", sub.pk, exc)
            continue
        sub.last_success_at = timezone.now()
        sub.save(update_fields=["last_success_at", "updated_at"])
        delivered += 1
    return delivered
