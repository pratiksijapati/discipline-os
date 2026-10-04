import { Pencil, Play } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { WeekStart } from "../../../types/auth";
import { describeDays } from "../../../utils/weekdays";
import type { WorkoutPlan } from "../types";
import styles from "./Workout.module.css";

interface PlanCardProps {
  plan: WorkoutPlan;
  weekStart: WeekStart;
  onStart?: (plan: WorkoutPlan) => void;
  onEdit: (plan: WorkoutPlan) => void;
  starting?: boolean;
  startDisabled?: boolean;
  highlight?: boolean;
}

export function PlanCard({ plan, weekStart, onStart, onEdit, starting, startDisabled, highlight }: PlanCardProps) {
  const names = plan.exercises.map((row) => row.exercise_name);
  return (
    <li className={highlight ? `${styles.plan} ${styles.planToday}` : styles.plan}>
      <div className={styles.planText}>
        {highlight && <span className={styles.todayTag}>Today</span>}
        <span className={styles.planName}>{plan.name}</span>
        <span className={styles.planMeta}>
          {plan.exercises.length} exercises
          {plan.days_of_week.length > 0 && ` · ${describeDays(plan.days_of_week, weekStart)}`}
        </span>
        <span className={styles.planExercises}>{names.join(", ")}</span>
      </div>
      <div className={styles.planActions}>
        <button type="button" className={styles.iconButton} onClick={() => onEdit(plan)} aria-label={`Edit ${plan.name}`}>
          <Pencil size={18} aria-hidden />
        </button>
        {onStart && (
          <Button
            icon={<Play size={18} aria-hidden />}
            onClick={() => onStart(plan)}
            loading={starting}
            disabled={startDisabled}
            aria-label={`Start ${plan.name}`}
          >
            Start
          </Button>
        )}
      </div>
    </li>
  );
}
