from rest_framework.routers import SimpleRouter

from .views import ReflectionViewSet

router = SimpleRouter()
router.register("reflections", ReflectionViewSet, basename="reflection")

urlpatterns = router.urls
