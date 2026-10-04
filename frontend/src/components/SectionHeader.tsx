import type { ReactNode } from "react";
import styles from "./SectionHeader.module.css";

export function SectionHeader({ title, id, action }: { title: string; id?: string; action?: ReactNode }) {
  return (
    <div className={styles.header}>
      <h2 id={id}>{title}</h2>
      {action}
    </div>
  );
}
