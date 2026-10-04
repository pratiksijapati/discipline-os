from rest_framework.routers import SimpleRouter

from .views import HabitViewSet

router = SimpleRouter()
router.register("habits", HabitViewSet, basename="habit")

urlpatterns = router.urls
