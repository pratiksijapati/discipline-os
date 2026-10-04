import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cn(styles.badge, styles[tone])}>{children}</span>;
}
