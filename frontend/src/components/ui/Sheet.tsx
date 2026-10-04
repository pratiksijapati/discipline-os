import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Sheet.module.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Bottom sheet on phones, centered dialog on larger screens.
 * Built on the native <dialog>, which gives focus trapping and Esc-to-close for free.
 * Content only mounts while open, so forms inside always start fresh.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click directly on <dialog> (not its panel) is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className={styles.panel}>
          <span className={styles.grabber} aria-hidden />
          <header className={styles.header}>
            <h2 id={titleId}>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <X size={20} aria-hidden />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
