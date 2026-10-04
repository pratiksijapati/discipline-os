import { CircleAlert } from "lucide-react";
import { toApiError } from "../api/errors";
import styles from "./LoadError.module.css";
import { Button } from "./ui/Button";

/** Shown when a page's data fails to load — never a blank screen. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className={styles.box} role="alert">
      <CircleAlert size={24} aria-hidden />
      <p>{toApiError(error).message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
