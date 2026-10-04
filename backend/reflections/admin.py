from django.contrib import admin

from .models import DailyReflection


@admin.register(DailyReflection)
class DailyReflectionAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "day_rating", "energy", "mood", "completed_at")
    list_filter = ("day_rating",)
    date_hierarchy = "date"
    search_fields = ("user__email",)
