import { ProgressRing } from "../../../components/ui/ProgressRing";
import type { DayStats } from "../types";
import styles from "./Review.module.css";

export function DayStatsCard({ stats, title = "Your day" }: { stats: DayStats; title?: string }) {
  const lines = [
    stats.schedule.total > 0 && `Plan ${stats.schedule.completed}/${stats.schedule.total}`,
    stats.tasks.total > 0 && `Tasks ${stats.tasks.completed}/${stats.tasks.total}`,
    stats.habits.total > 0 && `Habits ${stats.habits.completed}/${stats.habits.total}`,
    stats.routine.total > 0 && `Routine ${stats.routine.completed}/${stats.routine.total}`,
    stats.workout_done && "Workout ✓",
  ].filter(Boolean);

  return (
    <section className={styles.stats} aria-label={title}>
      <ProgressRing value={stats.progress} size={88} label={`Day progress ${stats.progress} percent`}>
        <span className={styles.statsPct}>{stats.progress}%</span>
      </ProgressRing>
      <div className={styles.statsBody}>
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
