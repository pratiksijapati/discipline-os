import { cn } from "../../utils/cn";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** On/off toggle. `label` is read by screen readers; show visible text next to it. */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.hit}
      onClick={() => onChange(!checked)}
    >
      <span className={cn(styles.track, checked && styles.on)}>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
