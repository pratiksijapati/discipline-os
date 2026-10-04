import type { ReactNode } from "react";
import styles from "./StatTile.module.css";

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 0–100: draws a small meter under the value. */
  meter?: number | null;
}

/** A labelled number: label (sentence case), value, optional detail and meter. */
export function StatTile({ label, value, sub, meter }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
      {meter !== undefined && meter !== null && (
        <dd className={styles.meter} aria-hidden>
          <span style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </dd>
      )}
      {sub && <dd className={styles.sub}>{sub}</dd>}
    </div>
  );
}
