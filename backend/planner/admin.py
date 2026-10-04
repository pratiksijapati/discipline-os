from django.contrib import admin

from .models import ScheduleItem, ScheduleTemplate


@admin.register(ScheduleTemplate)
class ScheduleTemplateAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "repeat", "start_time", "end_time", "is_active")
    list_filter = ("repeat", "is_active", "category")
    search_fields = ("title", "user__email")


@admin.register(ScheduleItem)
class ScheduleItemAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "date", "start_time", "status", "template", "is_customized", "is_removed")
    list_filter = ("status", "category", "is_removed")
    search_fields = ("title", "user__email")
    date_hierarchy = "date"
