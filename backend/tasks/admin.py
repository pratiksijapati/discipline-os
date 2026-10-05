from django.contrib import admin

from .models import DailyFocus, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "due_date", "priority", "status")
    list_filter = ("status", "priority", "category")
    search_fields = ("title", "user__email")


@admin.register(DailyFocus)
class DailyFocusAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "date", "completed")
    list_filter = ("completed",)
    search_fields = ("title", "user__email")
