import { Compass } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/ui/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <div className={styles.page}>
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        description="The link may be old or mistyped."
        action={
          <Link to="/today" className={styles.link}>
            Go to Today
          </Link>
        }
      />
    </div>
  );
}
