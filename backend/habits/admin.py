from django.contrib import admin

from .models import Habit, HabitLog


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "habit_type", "target_value", "unit", "frequency", "is_active")
    list_filter = ("habit_type", "frequency", "is_active", "category")
    search_fields = ("name", "user__email")


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ("habit", "user", "date", "value")
    date_hierarchy = "date"
    search_fields = ("habit__name", "user__email")
