import { Flame } from "lucide-react";
import { formatMinutes } from "../../../utils/duration";
import type { WorkoutStats } from "../types";
import styles from "./Workout.module.css";

function Meter({ label, count, target }: { label: string; count: number; target: number }) {
  const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
  return (
    <div className={styles.meter}>
      <div className={styles.meterTop}>
        <span>{label}</span>
        <strong>
          {count} / {target}
        </strong>
      </div>
      <div
        className={styles.meterBar}
        role="progressbar"
        aria-label={`${label}: ${count} of ${target} workouts`}
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatsCard({ stats }: { stats: WorkoutStats }) {
  return (
    <section className={styles.stats} aria-label="Workout progress">
      <Meter label="This week" count={stats.week.count} target={stats.week.target} />
      <Meter label="This month" count={stats.month.count} target={stats.month.target} />
      <p className={styles.streak}>
        <Flame size={18} aria-hidden />
        <strong>{stats.week_streak}</strong> week streak
        <span>· best {stats.best_week_streak}</span>
        <span className={styles.totals}>
          {stats.total_workouts} workout{stats.total_workouts === 1 ? "" : "s"} · {formatMinutes(stats.total_minutes * 60)}{" "}
          total
        </span>
      </p>
    </section>
  );
}
