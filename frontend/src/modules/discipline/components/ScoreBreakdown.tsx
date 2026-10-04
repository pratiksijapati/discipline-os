import { Flame } from "lucide-react";
import { cn } from "../../../utils/cn";
import { STREAK_LABELS } from "../constants";
import type { DayScore, Streaks } from "../types";
import styles from "./Score.module.css";

/** Sheet content: where today's points came from, and all streaks. */
export function ScoreBreakdown({ score, streaks }: { score: DayScore; streaks: Streaks }) {
  const skipped = score.breakdown.filter((c) => !c.applicable);

  return (
    <div className={styles.breakdown}>
      <ul className={styles.components}>
        {score.breakdown.map((c) => (
          <li key={c.key} className={cn(styles.component, !c.applicable && styles.skipped)}>
            <div className={styles.componentTop}>
              <span className={styles.componentLabel}>{c.label}</span>
              <span className={styles.componentPoints}>
                {c.applicable ? `${Math.round(c.points)} / ${c.weight}` : "—"}
              </span>
            </div>
            {c.applicable && (
              <div className={styles.componentBar} aria-hidden>
                <span style={{ width: `${Math.round(c.ratio * 100)}%` }} />
              </div>
            )}
            <span className={styles.componentDetail}>{c.detail}</span>
          </li>
        ))}
      </ul>

      {skipped.length > 0 && (
        <p className={styles.note}>
          {skipped.map((c) => c.label).join(", ")} {skipped.length === 1 ? "isn't" : "aren't"} tracked today, so your
          score is out of the rest — scaled to 100.
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
