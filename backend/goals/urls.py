from rest_framework.routers import SimpleRouter

from .views import GoalProgressViewSet, GoalViewSet

router = SimpleRouter()
router.register("goals", GoalViewSet, basename="goal")
router.register("goal-progress", GoalProgressViewSet, basename="goal-progress")

urlpatterns = router.urls
