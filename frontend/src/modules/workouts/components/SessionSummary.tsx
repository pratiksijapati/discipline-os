import { Link } from "react-router";
import { cn } from "../../../utils/cn";
import { formatMinutes } from "../../../utils/duration";
import { formatDay } from "../../../utils/time";
import { describeSet } from "../constants";
import type { WorkoutSession } from "../types";
import styles from "./LiveSession.module.css";

/** Shown when a workout is finished (right after completing, or from history). */
export function SessionSummary({ session }: { session: WorkoutSession }) {
  const cancelled = session.status === "cancelled";
  const trained = session.exercises.filter((row) => row.sets.length > 0);

  return (
    <div className={styles.summary}>
      <div className={cn(styles.hero, cancelled && styles.cancelled)}>
        <p className={styles.heroTitle}>{cancelled ? "Workout cancelled" : "WORKOUT COMPLETE 🔥"}</p>
        <p className={styles.heroSub}>
          {session.name} · {formatDay(session.date)}
        </p>
      </div>

      {!cancelled && (
        <dl className={styles.statGrid}>
          <div className={styles.stat}>
            <dt>Duration</dt>
            <dd>{formatMinutes(session.duration_seconds)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Exercises</dt>
            <dd>{session.totals.exercises}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Sets</dt>
            <dd>{session.totals.sets}</dd>
          </div>
          {session.totals.volume_kg > 0 && (
            <div className={styles.stat}>
              <dt>Volume</dt>
              <dd>{Math.round(session.totals.volume_kg).toLocaleString()} kg</dd>
            </div>
          )}
        </dl>
      )}

      {trained.length > 0 && (
        <ul className={styles.breakdown} aria-label="Exercises">
          {trained.map((row) => (
            <li key={row.id}>
              <p className={styles.breakdownName}>{row.exercise_name}</p>
              <p className={styles.breakdownSets}>{row.sets.map(describeSet).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}

      {session.notes && <p>{session.notes}</p>}

      <div className={styles.actions}>
        <Link to="/today" className="link-button">
          Back to Today
        </Link>
        <Link to="/workout" className="link-button link-button--secondary">
          Workouts
        </Link>
      </div>
    </div>
  );
}
