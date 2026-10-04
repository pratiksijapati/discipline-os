import type { ReactNode } from "react";
import styles from "./ProgressRing.module.css";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
}

export function ProgressRing({ value, size = 96, stroke = 9, label, children }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={styles.ring} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className={styles.bar}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.center}>{children}</div>
    </div>
  );
}
