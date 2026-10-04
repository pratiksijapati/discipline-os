import { cn } from "../../../utils/cn";
import { formatDay } from "../../../utils/time";
import type { HabitDay } from "../types";
import styles from "./HabitCard.module.css";

export function WeekStrip({ days, today }: { days: HabitDay[]; today: string }) {
  return (
    <ol className={styles.week} aria-label="This week">
      {days.map((day) => {
        const label = formatDay(day.date, { weekday: "short" });
        const state = day.done ? "done" : day.scheduled ? (day.date < today ? "missed" : "open") : "off";
        return (
          <li key={day.date} className={cn(styles.day, styles[state], day.date === today && styles.today)}>
            <span className={styles.dayLabel} aria-hidden>
              {label.charAt(0)}
            </span>
            <span className={styles.dot} aria-hidden />
            <span className="visually-hidden">
              {label}: {day.done ? "done" : day.scheduled ? "not done" : "not scheduled"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
