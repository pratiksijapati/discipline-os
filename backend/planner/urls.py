from rest_framework.routers import SimpleRouter

from django.urls import path

from .views import (
    MinimumChecklistView,
    MinimumDayView,
    RoutineItemViewSet,
    RoutineViewSet,
    ScheduleItemViewSet,
    ScheduleTemplateViewSet,
)

router = SimpleRouter()
router.register("schedule-templates", ScheduleTemplateViewSet, basename="schedule-template")
router.register("schedule", ScheduleItemViewSet, basename="schedule-item")
router.register("routines", RoutineViewSet, basename="routine")
router.register("routine-items", RoutineItemViewSet, basename="routine-item")

urlpatterns = [
    path("minimum-day/", MinimumDayView.as_view(), name="minimum-day"),
    path("minimum-day/checklist/", MinimumChecklistView.as_view(), name="minimum-checklist"),
    *router.urls,
]
