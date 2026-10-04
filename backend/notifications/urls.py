from django.urls import path

from .views import PreferenceView, PushConfigView, RunRemindersView, SubscriptionView, TestNotificationView

urlpatterns = [
    path("notifications/config/", PushConfigView.as_view(), name="push-config"),
    path("notifications/subscriptions/", SubscriptionView.as_view(), name="push-subscriptions"),
    path("notifications/preferences/", PreferenceView.as_view(), name="notification-preferences"),
    path("notifications/test/", TestNotificationView.as_view(), name="push-test"),
    path("notifications/run/", RunRemindersView.as_view(), name="reminders-run"),
]
