import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "../ui/Button";
import styles from "./Pwa.module.css";

const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Registers the service worker. When a new version has been deployed it asks
 * before reloading, so nothing you're typing is lost.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for a new version every hour while the app stays open.
      if (registration) window.setInterval(() => void registration.update(), CHECK_EVERY_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className={styles.update} role="alert">
      <span>A new version of Discipline OS is ready.</span>
      <Button size="md" icon={<RefreshCw size={16} aria-hidden />} onClick={() => void updateServiceWorker(true)}>
        Update
      </Button>
      <button type="button" className={styles.dismiss} onClick={() => setNeedRefresh(false)} aria-label="Later">
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
