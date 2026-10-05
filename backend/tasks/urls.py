from rest_framework.routers import SimpleRouter

from .views import DailyFocusViewSet, TaskViewSet

router = SimpleRouter()
router.register("tasks", TaskViewSet, basename="task")
router.register("daily-focus", DailyFocusViewSet, basename="daily-focus")

urlpatterns = router.urls
