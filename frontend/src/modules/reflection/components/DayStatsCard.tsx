import { Badge } from "../../../components/ui/Badge";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { RATING_TONE } from "../../discipline/constants";
import type { DayStats } from "../types";
import styles from "./Review.module.css";

/**
 * The day in numbers. After "Complete Day" the frozen stats include the
 * Discipline Score; while drafting, the simple completion % is shown.
 */
export function DayStatsCard({ stats, title = "Your day" }: { stats: DayStats; title?: string }) {
  const hasScore = typeof stats.score === "number";
  const ringValue = hasScore ? (stats.score as number) : stats.progress;
  const lines = [
    stats.schedule.total > 0 && `Plan ${stats.schedule.completed}/${stats.schedule.total}`,
    stats.tasks.total > 0 && `Tasks ${stats.tasks.completed}/${stats.tasks.total}`,
    stats.habits.total > 0 && `Habits ${stats.habits.completed}/${stats.habits.total}`,
    stats.routine.total > 0 && `Routine ${stats.routine.completed}/${stats.routine.total}`,
    stats.workout_done && "Workout ✓",
  ].filter(Boolean);

  return (
    <section className={styles.stats} aria-label={title}>
      <ProgressRing
        value={ringValue}
        size={88}
        label={hasScore ? `Discipline score ${ringValue} out of 100` : `Day progress ${ringValue} percent`}
      >
        <span className={styles.statsPct}>
          {ringValue}
          {!hasScore && "%"}
        </span>
      </ProgressRing>
      <div className={styles.statsBody}>
        {hasScore && stats.rating && <Badge tone={RATING_TONE[stats.rating]}>{stats.rating}</Badge>}
        <dl className={styles.counts}>
          <div>
            <dt>Completed</dt>
            <dd>{stats.completed}</dd>
          </div>
          <div>
            <dt>Not done</dt>
            <dd>{stats.not_done}</dd>
          </div>
        </dl>
        {lines.length > 0 && <p className={styles.statsLines}>{lines.join(" · ")}</p>}
      </div>
    </section>
  );
}
