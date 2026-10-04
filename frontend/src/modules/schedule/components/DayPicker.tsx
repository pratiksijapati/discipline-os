import type { WeekStart } from "../../../types/auth";
import { cn } from "../../../utils/cn";
import { orderedWeekdays } from "../constants";
import styles from "./ScheduleForm.module.css";

interface DayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  weekStart: WeekStart;
  error?: string[];
}

export function DayPicker({ value, onChange, weekStart, error }: DayPickerProps) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  }

  return (
    <fieldset className={styles.days}>
      <legend className={styles.legend}>Repeat on</legend>
      <div className={styles.dayRow}>
        {orderedWeekdays(weekStart).map(({ value: day, label }) => (
          <button
            key={day}
            type="button"
            className={cn(styles.day, value.includes(day) && styles.daySelected)}
            aria-pressed={value.includes(day)}
            onClick={() => toggle(day)}
          >
            {label.slice(0, 2)}
            <span className="visually-hidden">{label}</span>
          </button>
        ))}
      </div>
      {error?.map((message) => (
        <p key={message} className={styles.error}>
          {message}
        </p>
      ))}
    </fieldset>
  );
}
