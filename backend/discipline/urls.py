from django.urls import path

from .views import ProgressView, ScoreHistoryView, TodayDashboardView, TodayScoreView, WeeklyReviewView

urlpatterns = [
    path("dashboard/today/", TodayDashboardView.as_view(), name="dashboard-today"),
    path("discipline/today/", TodayScoreView.as_view(), name="discipline-today"),
    path("discipline/scores/", ScoreHistoryView.as_view(), name="discipline-scores"),
    path("progress/", ProgressView.as_view(), name="progress"),
    path("progress/weekly/", WeeklyReviewView.as_view(), name="progress-weekly"),
]
