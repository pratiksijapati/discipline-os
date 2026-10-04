from rest_framework.routers import SimpleRouter

from .views import ExerciseViewSet, WorkoutPlanViewSet, WorkoutSessionViewSet, WorkoutSetViewSet

router = SimpleRouter()
router.register("exercises", ExerciseViewSet, basename="exercise")
router.register("workout-plans", WorkoutPlanViewSet, basename="workout-plan")
router.register("workouts", WorkoutSessionViewSet, basename="workout")
router.register("workout-sets", WorkoutSetViewSet, basename="workout-set")

urlpatterns = router.urls
