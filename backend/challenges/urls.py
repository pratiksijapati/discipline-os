from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import WakeSessionViewSet, WakeTodayView

router = SimpleRouter()
router.register("wake/sessions", WakeSessionViewSet, basename="wake-session")

urlpatterns = [path("wake/today/", WakeTodayView.as_view(), name="wake-today"), *router.urls]
