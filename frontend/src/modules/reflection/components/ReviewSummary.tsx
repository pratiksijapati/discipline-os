import { CalendarArrowUp, Pencil } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/Button";
import { ratingEmoji, ratingLabel } from "../constants";
import type { DayStats, ReviewState } from "../types";
import { DayStatsCard } from "./DayStatsCard";
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

/** Shown after "Complete Day". */
export function ReviewSummary({ state, onEdit }: { state: ReviewState; onEdit: () => void }) {
  const r = state.reflection;
  if (!r) return null;

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

      <DayStatsCard stats={state.stats as DayStats} title="How the day went" />

      <div className={styles.answers}>
        <Answer label="What went well" text={r.went_well} />
        <Answer label="Improve tomorrow" text={r.improve} />
        <Answer label="Grateful for" text={r.grateful} />
      </div>

      <div className={styles.actions}>
        <Link to="/schedule" state={{ view: "tomorrow" }} className="link-button">
          <CalendarArrowUp size={18} aria-hidden /> Plan tomorrow
        </Link>
        <Button variant="secondary" icon={<Pencil size={18} aria-hidden />} onClick={onEdit}>
          Edit answers
        </Button>
      </div>
    </div>
  );
}
