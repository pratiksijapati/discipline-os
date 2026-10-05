import { CalendarArrowUp, Pencil } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/Button";
import { addDays } from "../../../utils/time";
import { ratingEmoji, ratingLabel } from "../constants";
import type { DayStats, ReviewState } from "../types";
import styles from "./Review.module.css";

function Answer({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div className={styles.answer}>
      <h3>{label}</h3>
      <p>{text}</p>
    </div>
  );
}

/** The day in a few plain lines — only what was actually part of the day. */
function dayLines(stats: DayStats): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  if (stats.focus) lines.push(["Today's focus", stats.focus.completed ? "Done ✓" : "Still open"]);
  if (stats.tasks.total > 0) lines.push(["Tasks completed", `${stats.tasks.completed} / ${stats.tasks.total}`]);
  if (stats.habits.total > 0) lines.push(["Habits", `${stats.habits.completed} / ${stats.habits.total}`]);
  if (stats.workout_done) lines.push(["Workout", "Completed ✓"]);
  if (stats.routine.total > 0) lines.push(["Morning routine", `${stats.routine.completed} / ${stats.routine.total}`]);
  if (stats.schedule.total > 0) lines.push(["Plan", `${stats.schedule.completed} / ${stats.schedule.total}`]);
  return lines;
}

/** Shown after "Complete Day": the result, then straight on to preparing tomorrow. */
export function ReviewSummary({ state, onEdit }: { state: ReviewState; onEdit: () => void }) {
  const r = state.reflection;
  if (!r) return null;
  const stats = state.stats as DayStats;
  const hasScore = typeof stats.score === "number";
  const lines = dayLines(stats);

  return (
    <div className={styles.summary}>
      <div className={styles.hero}>
        <span className={styles.heroEmoji} aria-hidden>
          {ratingEmoji(r.day_rating)}
        </span>
        <p className={styles.heroTitle}>Day complete</p>
        <p className={styles.heroSub}>
          {ratingLabel(r.day_rating)}
          {r.energy && ` · Energy ${r.energy}/5`}
          {r.mood && ` · Mood ${r.mood}/5`}
        </p>
      </div>

      <section className={styles.result} aria-label="Today's result">
        {hasScore && (
          <p className={styles.resultScore}>
            <span className={styles.resultLabel}>Discipline score</span>
            <span>
              <strong>{stats.score}</strong> / 100
            </span>
          </p>
        )}
        {lines.length > 0 && (
          <dl className={styles.resultLines}>
            {lines.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className={styles.next} aria-labelledby="ready-heading">
        <p id="ready-heading" className={styles.nextTitle}>
          Ready for tomorrow?
        </p>
        <p className={styles.nextSub}>Two minutes now makes the morning simple.</p>
        <Link to="/tomorrow" state={{ day: addDays(state.date, 1) }} className={`link-button ${styles.nextButton}`}>
          <CalendarArrowUp size={18} aria-hidden /> Prepare tomorrow
        </Link>
      </section>

      <div className={styles.answers}>
        <Answer label="What went well" text={r.went_well} />
        <Answer label="Improve tomorrow" text={r.improve} />
        <Answer label="Grateful for" text={r.grateful} />
      </div>

      <Button variant="ghost" block icon={<Pencil size={18} aria-hidden />} onClick={onEdit}>
        Edit answers
      </Button>
    </div>
  );
}
