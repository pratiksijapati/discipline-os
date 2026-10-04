import { Dumbbell, Flame, Play } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { formatMinutes } from "../../../utils/duration";
import { useStartWorkout } from "../../workouts/hooks";
import type { WorkoutToday } from "../../workouts/types";
import styles from "./WorkoutCard.module.css";

/** Today's workout at a glance: resume, start the planned one, or celebrate. */
export function WorkoutCard({ workout }: { workout: WorkoutToday }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const start = useStartWorkout();

  if (workout.active) {
    return (
      <section className={`${styles.card} ${styles.active}`} aria-label="Workout">
        <Dumbbell size={22} aria-hidden />
        <div className={styles.text}>
          <strong>{workout.active.name}</strong>
          <span>{workout.active.status === "paused" ? "Paused" : "In progress"}</span>
        </div>
        <Link to={`/workout/session/${workout.active.id}`} className="link-button">
          Resume
        </Link>
      </section>
    );
  }

  if (workout.completed) {
    return (
      <Link to={`/workout/session/${workout.completed.id}`} className={`${styles.card} ${styles.done}`}>
        <Flame size={22} aria-hidden />
        <div className={styles.text}>
          <strong>Workout complete 🔥</strong>
          <span>
            {workout.completed.name} · {formatMinutes(workout.completed.duration_seconds)}
          </span>
        </div>
      </Link>
    );
  }

  const plan = workout.planned[0];
  if (!plan) return null;

  return (
    <section className={styles.card} aria-label="Today's workout">
      <Dumbbell size={22} aria-hidden />
      <div className={styles.text}>
        <span className={styles.label}>Today's workout</span>
        <strong>{plan.name}</strong>
      </div>
      <Button
        icon={<Play size={18} aria-hidden />}
        loading={start.isPending}
        onClick={() =>
          start.mutate(plan.id, {
            onSuccess: (session) => navigate(`/workout/session/${session.id}`),
            onError: (error) => toast(toApiError(error).message, "error"),
          })
        }
      >
        Start
      </Button>
    </section>
  );
}
