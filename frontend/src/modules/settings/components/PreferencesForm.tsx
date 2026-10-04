import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { SelectField } from "../../../components/ui/Field";
import type { SettingsUpdate, WeekStart } from "../../../types/auth";
import { settingsApi } from "../api";
import styles from "../Settings.module.css";

const WEEK_START_OPTIONS = [
  { value: "6", label: "Sunday" },
  { value: "0", label: "Monday" },
];

const WORKOUT_TARGET_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} workout${i ? "s" : ""} per week`,
}));

/** Week start and workout target. Each change saves immediately. */
export function PreferencesForm() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: SettingsUpdate) => settingsApi.update(input),
    onSuccess: (settings) => {
      setUser({ ...user, settings });
      toast("Saved ✓");
      // Week boundaries and targets affect habits, schedules and stats.
      void queryClient.invalidateQueries();
    },
    onError: (error) => toast(toApiError(error).message, "error"),
  });

  return (
    <div className={styles.form}>
      <div className={styles.row}>
        <SelectField
          label="Week starts on"
          value={String(user.settings.week_start)}
          onChange={(e) => mutation.mutate({ week_start: Number(e.target.value) as WeekStart })}
          options={WEEK_START_OPTIONS}
        />
        <SelectField
          label="Workout target"
          value={String(user.settings.weekly_workout_target)}
          onChange={(e) => mutation.mutate({ weekly_workout_target: Number(e.target.value) })}
          options={WORKOUT_TARGET_OPTIONS}
          hint="Used for your week streak."
        />
      </div>
    </div>
  );
}
