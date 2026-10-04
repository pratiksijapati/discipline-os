from django.contrib import admin

from .models import WakeChallengeSession


@admin.register(WakeChallengeSession)
class WakeChallengeSessionAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "challenge_type", "method", "active_seconds", "status", "completed_at")
    list_filter = ("challenge_type", "method", "status")
    date_hierarchy = "date"
    search_fields = ("user__email",)
