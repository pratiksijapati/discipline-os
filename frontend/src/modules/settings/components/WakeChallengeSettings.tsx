import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { SelectField } from "../../../components/ui/Field";
import { Switch } from "../../../components/ui/Switch";
import type { SettingsUpdate, UserSettings } from "../../../types/auth";
import { CHALLENGE_TYPE_OPTIONS } from "../../wake/constants";
import { settingsApi } from "../api";
import styles from "../Settings.module.css";

const DURATION_OPTIONS = [30, 60, 90, 120, 180].map((s) => ({ value: String(s), label: s < 120 ? `${s} seconds` : `${s / 60} minutes` }));

/** Wake-up challenge: on/off, type and length. Saves on change. */
export function WakeChallengeSettings() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const s = user.settings;

  const save = useMutation({
    mutationFn: (input: SettingsUpdate) => settingsApi.update(input),
    onSuccess: (settings) => {
      setUser({ ...user, settings });
      toast("Saved ✓");
      void queryClient.invalidateQueries({ queryKey: ["wake"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast(toApiError(error).message, "error"),
  });

  return (
    <div className={styles.form}>
      <div className={styles.switchRow}>
        <div>
          <p className={styles.switchLabel}>Wake-up challenge</p>
          <p className={styles.sectionHint}>The wake-up reminder opens the challenge first.</p>
        </div>
        <Switch
          checked={s.wake_challenge_enabled}
          onChange={(checked) => save.mutate({ wake_challenge_enabled: checked })}
          label="Wake-up challenge"
        />
      </div>
      {s.wake_challenge_enabled && (
        <>
          <div className={styles.row}>
            <SelectField
              label="Challenge"
              value={s.wake_challenge_type}
              onChange={(e) => save.mutate({ wake_challenge_type: e.target.value as UserSettings["wake_challenge_type"] })}
              options={CHALLENGE_TYPE_OPTIONS}
            />
            <SelectField
              label="Length"
              value={String(s.wake_challenge_seconds)}
              onChange={(e) => save.mutate({ wake_challenge_seconds: Number(e.target.value) })}
              options={DURATION_OPTIONS}
              disabled={s.wake_challenge_type === "math"}
            />
          </div>
          <Link to="/wake" className={styles.tryLink}>
            Try the challenge now →
          </Link>
        </>
      )}
    </div>
  );
}
