import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { ToastContext, type ToastTone } from "./ToastContext";
import styles from "./Toast.module.css";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const DURATION_MS = 2600;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, message, tone }].slice(-MAX_VISIBLE));
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, DURATION_MS);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div key={item.id} className={cn(styles.toast, styles[item.tone])}>
              <Icon size={18} aria-hidden />
              <span>{item.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
