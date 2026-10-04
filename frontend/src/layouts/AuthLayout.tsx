import type { ReactNode } from "react";
import { BrandMark } from "../components/BrandMark";
import styles from "./AuthLayout.module.css";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <main className={styles.column}>
        <BrandMark />
        <div className={styles.intro}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className={styles.card}>{children}</div>
        <p className={styles.footer}>{footer}</p>
      </main>
    </div>
  );
}
