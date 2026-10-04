from rest_framework.response import Response
from rest_framework.views import APIView

from habits.serializers import serialize_card
from planner.serializers import ScheduleItemSerializer
from tasks.serializers import TaskSerializer

from .services import build_today


class TodayDashboardView(APIView):
    """GET /api/dashboard/today/ — everything the Today page needs in one request."""

    def get(self, request):
        snap = build_today(request.user)
        context = {"request": request, "today": snap.today, "now_time": snap.now_time}

        def item(obj):
            return ScheduleItemSerializer(obj, context=context).data if obj else None

        return Response(
            {
                "date": snap.today.isoformat(),
                "now": snap.now.isoformat(),
                "current": item(snap.current),
                "next": item(snap.next),
                "schedule": ScheduleItemSerializer(snap.schedule, many=True, context=context).data,
                "tasks": TaskSerializer(snap.tasks, many=True, context=context).data,
                # Habits that matter today: due today, or already done today.
                "habits": [
                    serialize_card(card, context) for card in snap.habit_cards if card["due_today"] or card["completed"]
                ],
                "routine": snap.routine,
                "summary": snap.summary,
            }
        )
