import { ChevronRight, Flame } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { Sheet } from "../../../components/ui/Sheet";
import type { TodaySummary } from "../../today/types";
import { RATING_TONE } from "../constants";
import type { DayScore, Streaks } from "../types";
import { ScoreBreakdown } from "./ScoreBreakdown";
import styles from "./Score.module.css";

function countsLine(target: number, summary: TodaySummary): string {
  return [
    `Target ${target}`,
    summary.schedule.total > 0 && `Plan ${summary.schedule.completed}/${summary.schedule.total}`,
    summary.tasks.total > 0 && `Tasks ${summary.tasks.completed}/${summary.tasks.total}`,
    summary.habits.total > 0 && `Habits ${summary.habits.completed}/${summary.habits.total}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface ScoreCardProps {
  score: DayScore;
  streaks: Streaks;
  summary: TodaySummary;
}

/** Today's Discipline Score — tap for the breakdown and streaks. */
export function ScoreCard({ score, streaks, summary }: ScoreCardProps) {
  const [open, setOpen] = useState(false);
  const value = score.score;
  const streak = streaks.discipline.current;
  // While the day is still running, a low score is just "in progress" — never discouraging.
  const showRating = score.rating && (score.is_final || (value ?? 0) >= 60);

  return (
    <>
      <button type="button" className={styles.card} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <ProgressRing
          value={value ?? 0}
          size={96}
          label={value === null ? "No score yet" : `Discipline score ${value} out of 100`}
        >
          <span className={styles.value}>{value ?? "—"}</span>
          <span className={styles.outOf}>/ 100</span>
        </ProgressRing>

        <span className={styles.body}>
          <span className={styles.heading}>Discipline Score</span>
          {value === null ? (
            <span className={styles.message}>Add a routine, habits or tasks to start scoring your day.</span>
          ) : (
            <span className={styles.ratingRow}>
              {showRating && score.rating ? (
                <Badge tone={RATING_TONE[score.rating]}>{score.rating}</Badge>
              ) : (
                <Badge>Day in progress</Badge>
              )}
            </span>
          )}
          {streak > 0 && (
            <span className={styles.streakChip}>
              <Flame size={14} aria-hidden /> {streak} day streak
            </span>
          )}
          <span className={styles.counts}>{countsLine(score.target, summary)}</span>
        </span>
        <ChevronRight size={18} aria-hidden className={styles.chevron} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={value === null ? "Discipline score" : `Score ${value} / 100`}>
        <ScoreBreakdown score={score} streaks={streaks} />
      </Sheet>
    </>
  );
}
