from django.contrib import admin
from django.urls import include, path

from core.views import health
from users.views import UserSettingsView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("users.urls")),
    path("api/settings/", UserSettingsView.as_view(), name="user-settings"),
    path("api/", include("planner.urls")),
    path("api/", include("tasks.urls")),
    path("api/", include("habits.urls")),
    path("api/", include("workouts.urls")),
    path("api/", include("discipline.urls")),
]
