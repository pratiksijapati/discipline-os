from django.contrib import admin

from .models import Exercise, PlanExercise, SessionExercise, WorkoutPlan, WorkoutSession, WorkoutSet


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "category", "measure", "is_active")
    list_filter = ("category", "measure", "is_active")
    search_fields = ("name", "user__email")


class PlanExerciseInline(admin.TabularInline):
    model = PlanExercise
    extra = 0


@admin.register(WorkoutPlan)
class WorkoutPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_active")
    inlines = [PlanExerciseInline]


class SessionExerciseInline(admin.TabularInline):
    model = SessionExercise
    extra = 0


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "date", "status", "duration_seconds")
    list_filter = ("status",)
    date_hierarchy = "date"
    inlines = [SessionExerciseInline]


@admin.register(WorkoutSet)
class WorkoutSetAdmin(admin.ModelAdmin):
    list_display = ("session_exercise", "set_number", "reps", "weight_kg", "duration_seconds")
