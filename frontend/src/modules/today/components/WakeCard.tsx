import { Sun } from "lucide-react";
import { Link } from "react-router";
import { useCurrentUser } from "../../../auth/useAuth";
import type { TodayDashboard } from "../types";
import styles from "./WorkoutCard.module.css";

const MORNING_UNTIL_HOUR = 12;

/** Morning nudge to do the wake-up challenge, until it's done or the morning is over. */
export function WakeCard({ data }: { data: TodayDashboard }) {
  const user = useCurrentUser();
  const hour = Number(data.now.slice(11, 13));
  const wake = data.score.breakdown.find((c) => c.key === "wake_up");
  const done = wake?.applicable && wake.ratio > 0;

  if (!user.settings.wake_challenge_enabled || done || hour >= MORNING_UNTIL_HOUR) return null;

  return (
    <section className={`${styles.card} ${styles.active}`} aria-label="Wake-up challenge">
      <Sun size={22} aria-hidden />
      <div className={styles.text}>
        <strong>Wake-up challenge</strong>
        <span>Finish it to start your morning routine.</span>
      </div>
      <Link to="/wake" className="link-button">
        Start
      </Link>
    </section>
  );
}
