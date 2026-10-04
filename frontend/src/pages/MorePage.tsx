import { ChevronRight, LogOut } from "lucide-react";
import { Link } from "react-router";
import { useAuth, useCurrentUser } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { SECONDARY_NAV } from "../layouts/navigation";
import styles from "./MorePage.module.css";

export function MorePage() {
  useDocumentTitle("More");
  const user = useCurrentUser();
  const { logout } = useAuth();

  return (
    <>
      <PageHeader title="More" subtitle={user.email} />
      <nav aria-label="More sections" className={styles.list}>
        {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={styles.row}>
            <span className={styles.icon} aria-hidden>
              <Icon size={20} />
            </span>
            <span className={styles.label}>{label}</span>
            <ChevronRight size={18} aria-hidden className={styles.chevron} />
          </Link>
        ))}
      </nav>
      <button type="button" className={styles.logout} onClick={() => void logout()}>
        <LogOut size={20} aria-hidden />
        Log out
      </button>
    </>
  );
}
