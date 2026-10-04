from django.urls import path

from .views import ScoreHistoryView, TodayDashboardView, TodayScoreView

urlpatterns = [
    path("dashboard/today/", TodayDashboardView.as_view(), name="dashboard-today"),
    path("discipline/today/", TodayScoreView.as_view(), name="discipline-today"),
    path("discipline/scores/", ScoreHistoryView.as_view(), name="discipline-scores"),
]
