import { WifiOff } from "lucide-react";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import styles from "./StatusScreen.module.css";

export function FullScreenLoader() {
  return (
    <div className={styles.screen}>
      <Spinner size={32} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className={styles.page}>
      <Spinner size={28} />
    </div>
  );
}

export function ConnectionProblem({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.screen}>
      <div className={styles.message}>
        <WifiOff size={32} aria-hidden />
        <h1>Can't reach Discipline OS</h1>
        <p>You're still logged in. Check your connection, then try again.</p>
        <Button onClick={onRetry} size="lg">
          Try again
        </Button>
      </div>
    </div>
  );
}
