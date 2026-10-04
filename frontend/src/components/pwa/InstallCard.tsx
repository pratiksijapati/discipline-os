import { CircleCheck, Download, Share, SquarePlus } from "lucide-react";
import { useToast } from "../toast/useToast";
import { Button } from "../ui/Button";
import { useInstallState } from "../../hooks/useInstallState";
import { promptInstall } from "../../services/pwa";
import styles from "./Pwa.module.css";

/** "Install Discipline OS" — the right instructions for this browser. */
export function InstallCard() {
  const state = useInstallState();
  const { toast } = useToast();

  if (state === "installed") {
    return (
      <p className={styles.installed}>
        <CircleCheck size={18} aria-hidden /> Installed — you're using the app.
      </p>
    );
  }

  if (state === "available") {
    return (
      <div className={styles.install}>
        <p>Add Discipline OS to your home screen. It opens full screen, like an app.</p>
        <Button
          icon={<Download size={18} aria-hidden />}
          onClick={async () => {
            if (await promptInstall()) toast("Installed ✓");
          }}
        >
          Install app
        </Button>
      </div>
    );
  }

  if (state === "ios") {
    return (
      <ol className={styles.steps}>
        <li>
          Tap <Share size={16} aria-label="Share" /> <strong>Share</strong> in Safari's toolbar.
        </li>
        <li>
          Choose <SquarePlus size={16} aria-hidden /> <strong>Add to Home Screen</strong>.
        </li>
        <li>
          Tap <strong>Add</strong>. Open Discipline OS from your home screen.
        </li>
      </ol>
    );
  }

  return (
    <p className={styles.hint}>
      Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. In Chrome on
      Android this appears once the site is served over HTTPS (after deployment).
    </p>
  );
}
