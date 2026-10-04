from rest_framework.routers import SimpleRouter

from .views import RoutineItemViewSet, RoutineViewSet, ScheduleItemViewSet, ScheduleTemplateViewSet

router = SimpleRouter()
router.register("schedule-templates", ScheduleTemplateViewSet, basename="schedule-template")
router.register("schedule", ScheduleItemViewSet, basename="schedule-item")
router.register("routines", RoutineViewSet, basename="routine")
router.register("routine-items", RoutineItemViewSet, basename="routine-item")

urlpatterns = router.urls
