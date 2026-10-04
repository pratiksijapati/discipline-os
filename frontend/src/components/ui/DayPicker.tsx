import type { WeekStart } from "../../types/auth";
import { cn } from "../../utils/cn";
import { orderedWeekdays } from "../../utils/weekdays";
import styles from "./DayPicker.module.css";

interface DayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  weekStart: WeekStart;
  legend?: string;
  error?: string[];
}

export function DayPicker({ value, onChange, weekStart, legend = "Repeat on", error }: DayPickerProps) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  }

  return (
    <fieldset className={styles.days}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.row}>
        {orderedWeekdays(weekStart).map(({ value: day, label }) => (
          <button
            key={day}
            type="button"
            className={cn(styles.day, value.includes(day) && styles.selected)}
            aria-pressed={value.includes(day)}
            aria-label={label}
            onClick={() => toggle(day)}
          >
            {label.slice(0, 2)}
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
