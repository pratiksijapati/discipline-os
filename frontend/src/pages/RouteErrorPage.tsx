import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useRouteError } from "react-router";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FullScreenLoader } from "../components/StatusScreen";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { isStaleBuildError, reloadForNewBuild } from "../services/staleBuild";
import styles from "./NotFoundPage.module.css";

/** Shown instead of React Router's developer error page when a screen crashes. */
export function RouteErrorPage() {
  useDocumentTitle("Something went wrong");
  const error = useRouteError();
  const stale = isStaleBuildError(error);

  // A new version was deployed while this page was open: reload into it.
  useEffect(() => {
    if (stale) reloadForNewBuild();
  }, [stale]);

  if (stale) return <FullScreenLoader />;

  console.error(error);
  return (
    <div className={styles.page}>
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="Your data is safe. Reloading usually fixes this."
        action={
          <div className={styles.actions}>
            <Button icon={<RefreshCw size={18} aria-hidden />} onClick={() => window.location.reload()}>
              Reload
            </Button>
            <a href="/today" className={styles.textLink}>
              Go to Today
            </a>
          </div>
        }
      />
    </div>
  );
}
