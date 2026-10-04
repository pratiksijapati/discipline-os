import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import styles from "./Pwa.module.css";

/** Honest offline notice: the app opens, but nothing can be saved until you're back online. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={styles.offline} role="status">
      <WifiOff size={16} aria-hidden />
      You're offline. You can look around, but changes need a connection.
    </div>
  );
}
