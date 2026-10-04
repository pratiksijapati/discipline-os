import styles from "./BrandMark.module.css";

export function BrandMark({ showName = true }: { showName?: boolean }) {
  return (
    <span className={styles.brand}>
      <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--accent-strong)" />
        <path
          d="M19 33.5l8.5 8.5L45 23"
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showName && <span className={styles.name}>Discipline OS</span>}
    </span>
  );
}
