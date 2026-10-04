from django.contrib import admin

from .models import Goal, GoalProgress


class GoalProgressInline(admin.TabularInline):
    model = GoalProgress
    extra = 0
    readonly_fields = ("date", "delta", "value_after", "note", "created_at")


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "measure", "current_value", "target_value", "status", "is_main", "deadline")
    list_filter = ("status", "category", "measure", "is_main")
    search_fields = ("title", "user__email")
    inlines = [GoalProgressInline]
