from django.contrib import admin

from .models import NotificationPreference, PushSubscription, SentReminder


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "user_agent", "created_at", "last_success_at")
    search_fields = ("user__email",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "enabled", "wake_up", "tasks", "habits", "night_review")


@admin.register(SentReminder)
class SentReminderAdmin(admin.ModelAdmin):
    list_display = ("user", "key", "sent_at")
    search_fields = ("user__email", "key")
