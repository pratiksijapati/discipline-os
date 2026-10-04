import { Check } from "lucide-react";
import { cn } from "../../utils/cn";
import styles from "./CheckButton.module.css";

interface CheckButtonProps {
  checked: boolean;
  onToggle: () => void;
  /** e.g. "Mark Workout as done" */
  label: string;
  disabled?: boolean;
}

/** A round, thumb-sized check-off control (44px hit area). */
export function CheckButton({ checked, onToggle, label, disabled }: CheckButtonProps) {
  return (
    <button
      type="button"
      className={styles.hit}
      aria-pressed={checked}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
    >
      <span className={cn(styles.circle, checked && styles.checked)}>
        {checked && <Check size={16} strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}
