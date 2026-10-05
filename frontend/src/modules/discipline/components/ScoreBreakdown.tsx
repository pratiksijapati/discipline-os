import { Flame } from "lucide-react";
import { cn } from "../../../utils/cn";
import { STREAK_LABELS } from "../constants";
import type { DayScore, Streaks } from "../types";
import styles from "./Score.module.css";

/** One encouraging line about what's still possible — never a judgement. */
function reachLine(score: DayScore): string | null {
  if (score.score === null) return "Add a routine, habits or tasks to start scoring your day.";
  if (score.is_final) return "Final score for this day.";
  const max = score.max_possible ?? 100;
  if (max <= score.score) return "You've earned everything available today ✓";
  return `You can still reach ${max} today.`;
}

/** Sheet content: today's score, what's still reachable, each part's points, and all streaks. */
export function ScoreBreakdown({ score, streaks }: { score: DayScore; streaks: Streaks }) {
  const counted = score.breakdown.filter((c) => c.applicable);
  const skipped = score.breakdown.filter((c) => !c.applicable);
  const note = reachLine(score);

  return (
    <div className={styles.breakdown}>
      <div className={styles.summary}>
        <p className={styles.summaryScore}>
          {score.score ?? "—"} <span>/ 100</span>
        </p>
        {note && <p className={styles.summaryNote}>{note}</p>}
      </div>

      {counted.length > 0 && (
        <ul className={styles.components}>
          {counted.map((c) => {
            const full = c.ratio >= 1;
            return (
              <li key={c.key} className={styles.component}>
                <div className={styles.componentTop}>
                  <span className={styles.componentLabel}>{c.label}</span>
                  <span className={cn(styles.componentPoints, full && styles.full)}>
                    {Math.round(c.points)} / {c.weight}
                    {full && " ✓"}
                  </span>
                </div>
                <div className={styles.componentBar} aria-hidden>
                  <span style={{ width: `${Math.round(c.ratio * 100)}%` }} />
                </div>
                <span className={styles.componentDetail}>{c.detail}</span>
              </li>
            );
          })}
        </ul>
      )}

      {skipped.length > 0 && (
        <p className={styles.note}>
          Not counted today: {skipped.map((c) => c.label).join(", ")}. Your score is out of the rest, scaled to 100.
        </p>
      )}

      <section aria-labelledby="streaks-heading">
        <h3 id="streaks-heading" className={styles.subheading}>
          Streaks
        </h3>
        <ul className={styles.streaks}>
          {(Object.keys(STREAK_LABELS) as Array<keyof Streaks>).map((key) => {
            const s = streaks[key];
            return (
              <li key={key}>
                <Flame size={18} aria-hidden className={s.current > 0 ? styles.flameOn : styles.flameOff} />
                <span className={styles.streakLabel}>
                  {STREAK_LABELS[key]}
                  {key === "discipline" && s.threshold !== undefined && (
                    <span className={styles.streakHint}> · days at {s.threshold}+</span>
                  )}
                </span>
                <span className={styles.streakValue}>
                  {s.current} {s.unit === "weeks" ? "wk" : "d"}
                  <span className={styles.streakBest}> · best {s.best}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
