import { Minus, Plus } from "lucide-react";
import styles from "./Stepper.module.css";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  /** e.g. "glasses of water" — used in button labels for screen readers. */
  label: string;
}

/** [-] value [+] with large tap targets. */
export function Stepper({ value, onChange, step = 1, label }: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(Math.max(0, value - step))}
        disabled={value <= 0}
        aria-label={`Decrease ${label}`}
      >
        <Minus size={18} aria-hidden />
      </button>
      <output className={styles.value} aria-live="polite">
        {value}
      </output>
      <button type="button" className={styles.button} onClick={() => onChange(value + step)} aria-label={`Increase ${label}`}>
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}
