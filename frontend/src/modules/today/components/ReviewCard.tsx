import { Moon } from "lucide-react";
import { Link } from "react-router";
import { ratingEmoji } from "../../reflection/constants";
import type { TodayDashboard } from "../types";
import styles from "./WorkoutCard.module.css";

const EVENING_HOUR = 18;

/** Evening nudge to do the Night Review, then a "Day complete" badge. */
export function ReviewCard({ data }: { data: TodayDashboard }) {
  const hour = Number(data.now.slice(11, 13));

  if (data.reflection.completed) {
    return (
      <Link to="/tomorrow" className={`${styles.card} ${styles.done}`}>
        <span aria-hidden style={{ fontSize: 22 }}>
          {ratingEmoji(data.reflection.day_rating)}
        </span>
        <div className={styles.text}>
          <strong>Day complete ✓</strong>
          <span>Prepare tomorrow →</span>
        </div>
      </Link>
    );
  }

  if (hour < EVENING_HOUR) return null;

  return (
    <section className={`${styles.card} ${styles.active}`} aria-label="Night review">
      <Moon size={22} aria-hidden />
      <div className={styles.text}>
        <strong>Night review is ready</strong>
        <span>Two minutes to close the day.</span>
      </div>
      <Link to="/reflection" className="link-button">
        Start
      </Link>
    </section>
  );
}
