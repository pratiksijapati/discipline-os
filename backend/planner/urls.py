from rest_framework.routers import SimpleRouter

from .views import ScheduleItemViewSet, ScheduleTemplateViewSet

router = SimpleRouter()
router.register("schedule-templates", ScheduleTemplateViewSet, basename="schedule-template")
router.register("schedule", ScheduleItemViewSet, basename="schedule-item")

urlpatterns = router.urls
