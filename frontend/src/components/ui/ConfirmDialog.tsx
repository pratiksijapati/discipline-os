import type { ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";
import { Sheet } from "./Sheet";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/** Used before deleting anything important. */
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, busy }: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
