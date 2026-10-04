import { ProgressRing } from "../../../components/ui/ProgressRing";
import type { TodaySummary } from "../types";
import styles from "./ProgressCard.module.css";

function encouragement(progress: number, total: number): string {
  if (total === 0) return "Add a plan to start tracking.";
  if (progress >= 100) return "Everything done. Strong day.";
  if (progress >= 70) return "Almost there — keep going.";
  if (progress >= 30) return "Good momentum.";
  return "One step at a time.";
}

export function ProgressCard({ summary }: { summary: TodaySummary }) {
  const total = summary.schedule.total + summary.tasks.total;
  return (
    <section className={styles.card} aria-labelledby="progress-heading">
      <ProgressRing value={summary.progress} label={`Today's progress: ${summary.progress} percent`}>
        <span className={styles.value}>
          {summary.progress}
          <span className={styles.pct}>%</span>
        </span>
      </ProgressRing>
      <div className={styles.body}>
        <h2 id="progress-heading" className={styles.heading}>
          Today's progress
        </h2>
        <p className={styles.message}>{encouragement(summary.progress, total)}</p>
        <dl className={styles.stats}>
          <div>
            <dt>Plan</dt>
            <dd>
              {summary.schedule.completed}/{summary.schedule.total}
            </dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>
              {summary.tasks.completed}/{summary.tasks.total}
            </dd>
          </div>
          {summary.schedule.missed > 0 && (
            <div>
              <dt>Missed</dt>
              <dd>{summary.schedule.missed}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
