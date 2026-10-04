import { Plus } from "lucide-react";
import styles from "./Fab.module.css";

/** Floating "+" in the thumb zone, above the bottom navigation. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.fab} onClick={onClick} aria-label={label} title={label}>
      <Plus size={26} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
