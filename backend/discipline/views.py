from datetime import date, timedelta

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from core.time import user_today
from goals.models import Goal
from goals.serializers import GoalSerializer
from habits.serializers import serialize_card
from planner.serializers import ScheduleItemSerializer
from reflections.models import DailyReflection
from tasks.serializers import TaskSerializer

from . import engine, scoring
from .models import DailyScore
from .services import build_today

MAX_SCORE_RANGE_DAYS = 400


class TodayDashboardView(APIView):
    """GET /api/dashboard/today/ — everything the Today page needs in one request."""

    def get(self, request):
        snap = build_today(request.user)
        engine.finalize_past_days(request.user, snap.day)
        today_score = engine.save_score(request.user, snap.day, snap, final=False)
        context = {"request": request, "today": snap.day, "now_time": snap.now_time}

        def item(obj):
            return ScheduleItemSerializer(obj, context=context).data if obj else None

        main_goal = Goal.objects.filter(user=request.user, is_main=True).first()
        reflection = DailyReflection.objects.filter(user=request.user, date=snap.day).first()

        return Response(
            {
                "date": snap.day.isoformat(),
                "now": snap.now.isoformat(),
                "score": engine.score_payload(request.user, today_score),
                "streaks": engine.streaks(request.user, snap.day, today_score),
                "current": item(snap.current),
                "next": item(snap.next),
                "schedule": ScheduleItemSerializer(snap.schedule, many=True, context=context).data,
                "tasks": TaskSerializer(snap.tasks, many=True, context=context).data,
                # Habits that matter today: due today, or already done today.
                "habits": [
                    serialize_card(card, context) for card in snap.habit_cards if card["due_today"] or card["completed"]
                ],
                "routine": snap.routine,
                "workout": snap.workout,
                "main_goal": GoalSerializer(main_goal, context=context).data if main_goal else None,
                "reflection": {
                    "completed": bool(reflection and reflection.is_completed),
                    "day_rating": reflection.day_rating if reflection else None,
                },
                "summary": snap.summary,
            }
        )


class TodayScoreView(APIView):
    """GET /api/discipline/today/ — today's score with breakdown, plus streaks."""

    def get(self, request):
        snap = build_today(request.user)
        engine.finalize_past_days(request.user, snap.day)
        today_score = engine.save_score(request.user, snap.day, snap, final=False)
        return Response(
            {
                **engine.score_payload(request.user, today_score),
                "streaks": engine.streaks(request.user, snap.day, today_score),
            }
        )


class ScoreHistoryView(APIView):
    """GET /api/discipline/scores/?start=YYYY-MM-DD&end=YYYY-MM-DD (default: last 30 days)."""

    def get(self, request):
        today = user_today(request.user)
        try:
            end = date.fromisoformat(request.query_params.get("end", today.isoformat()))
            start = date.fromisoformat(request.query_params.get("start", (end - timedelta(days=29)).isoformat()))
        except ValueError:
            raise serializers.ValidationError({"start": ["Use the format YYYY-MM-DD."]})
        if start > end or (end - start).days > MAX_SCORE_RANGE_DAYS:
            raise serializers.ValidationError({"start": [f"Ask for 1–{MAX_SCORE_RANGE_DAYS} days."]})

        engine.finalize_past_days(request.user, today)
        rows = DailyScore.objects.filter(user=request.user, date__range=(start, min(end, today))).order_by("date")
        return Response(
            [
                {"date": r.date.isoformat(), "score": r.score, "rating": scoring.rating_for(r.score), "is_final": r.is_final}
                for r in rows
            ]
        )
