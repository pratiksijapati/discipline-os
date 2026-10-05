import { ChevronRight, Flame } from "lucide-react";
import { useState } from "react";
import { Sheet } from "../../../components/ui/Sheet";
import type { DayScore, Streaks } from "../types";
import { ScoreBreakdown } from "./ScoreBreakdown";
import styles from "./ScoreChip.module.css";

/** Small "🔥 8-day streak · Score 64/100" line under the greeting — tap for the breakdown. */
export function ScoreChip({ score, streaks }: { score: DayScore; streaks: Streaks }) {
  const [open, setOpen] = useState(false);
  const value = score.score;
  const streak = streaks.discipline.current;

  return (
    <>
      <button type="button" className={styles.chip} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {streak > 0 && (
          <span className={styles.streak}>
            <Flame size={15} aria-hidden /> {streak}-day streak
          </span>
        )}
        <span>
          Score <strong>{value ?? "—"}</strong>
          {value !== null && <span className={styles.outOf}> / 100</span>}
        </span>
        <ChevronRight size={16} aria-hidden className={styles.chevron} />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Today's discipline score">
        <ScoreBreakdown score={score} streaks={streaks} />
      </Sheet>
    </>
  );
}
