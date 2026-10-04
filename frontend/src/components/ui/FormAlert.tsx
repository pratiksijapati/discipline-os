import { CircleAlert } from "lucide-react";
import styles from "./FormAlert.module.css";

/** A form-level error (not tied to one field). Announced to screen readers. */
export function FormAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className={styles.alert}>
      <CircleAlert size={18} aria-hidden />
      <p>{message}</p>
    </div>
  );
}
