import { Pause, Pin } from "lucide-react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Badge } from "../../../components/ui/Badge";
import { cn } from "../../../utils/cn";
import { describeDeadline, formatProgress, GOAL_CATEGORY_META, quickStep } from "../constants";
import { useLogGoal } from "../hooks";
import type { Goal } from "../types";
import styles from "./Goals.module.css";

interface GoalCardProps {
  goal: Goal;
  onOpen: (goal: Goal) => void;
  /** Compact version for the Today page. */
  compact?: boolean;
}

export function GoalCard({ goal, onOpen, compact = false }: GoalCardProps) {
  const { toast } = useToast();
  const log = useLogGoal();
  const { icon: Icon, label } = GOAL_CATEGORY_META[goal.category];
  const deadline = describeDeadline(goal.days_left);
  const step = goal.status === "completed" ? null : quickStep(goal);
  const done = goal.status === "completed";

  function quickLog() {
    if (!step) return onOpen(goal);
    log.mutate(
      { id: goal.id, input: { amount: step.amount, mode: step.mode } },
      {
        onSuccess: (updated) =>
          toast(updated.status === "completed" ? `Goal achieved: ${updated.title} 🎉` : `${updated.title}: ${formatProgress(updated)}`),
        onError: (error) => toast(toApiError(error).message, "error"),
      },
    );
  }

  return (
    <article className={cn(styles.card, done && styles.done, goal.status === "paused" && styles.paused)}>
      <button type="button" className={styles.main} onClick={() => onOpen(goal)}>
        <span className={styles.icon} aria-hidden>
          <Icon size={20} />
        </span>
        <span className={styles.text}>
          <span className={styles.meta}>
            {compact ? "Today's main goal" : label}
            {goal.is_main && !compact && <Pin size={12} aria-label="Main goal" />}
          </span>
          <span className={styles.title}>{goal.title}</span>
          <span className={styles.progressText}>
            {formatProgress(goal)}
            {goal.measure !== "boolean" && goal.measure !== "percentage" && <span> · {goal.progress_pct}%</span>}
          </span>
        </span>
      </button>

      <div className={styles.side}>
        {goal.status === "paused" ? (
          <Badge>
            <Pause size={12} aria-hidden /> Paused
          </Badge>
        ) : done ? (
          <Badge tone="success">Achieved</Badge>
        ) : (
          <button type="button" className={styles.quick} onClick={quickLog} disabled={log.isPending}>
            {step ? step.label : "Log"}
          </button>
        )}
      </div>

      <div className={styles.bar} aria-hidden>
        <span style={{ width: `${goal.progress_pct}%` }} />
      </div>
      {deadline && !done && (
        <p className={cn(styles.deadline, deadline.overdue && styles.overdue)}>{deadline.text}</p>
      )}
    </article>
  );
}
