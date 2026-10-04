from django.contrib import admin

from .models import DailyScore


@admin.register(DailyScore)
class DailyScoreAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "score", "is_final", "computed_at")
    list_filter = ("is_final",)
    date_hierarchy = "date"
    search_fields = ("user__email",)
