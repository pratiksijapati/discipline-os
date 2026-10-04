import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { SelectField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { SettingsUpdate } from "../../../types/auth";
import { toInputTime } from "../../../utils/time";
import { COMPONENT_LABELS, COMPONENT_ORDER } from "../../discipline/constants";
import { settingsApi } from "../api";
import styles from "../Settings.module.css";

const DEFAULT_WEIGHTS: Record<string, number> = {
  wake_up: 15,
  morning_routine: 10,
  workout: 20,
  important_tasks: 25,
  habits: 15,
  growth: 10,
  reflection: 5,
};

const GRACE_OPTIONS = [0, 5, 10, 15, 30, 60].map((m) => ({ value: String(m), label: m ? `${m} minutes` : "No grace" }));
const PERCENT_OPTIONS = [50, 60, 65, 70, 75, 80, 85, 90].map((n) => ({ value: String(n), label: String(n) }));

/** Wake-up time, streak threshold, daily target and score weights. */
export function DisciplineSettingsForm() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const s = user.settings;

  const [wakeTime, setWakeTime] = useState(toInputTime(s.wake_time));
  const [grace, setGrace] = useState(String(s.wake_grace_minutes));
  const [threshold, setThreshold] = useState(String(s.streak_threshold));
  const [target, setTarget] = useState(String(s.daily_target_score));
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries(COMPONENT_ORDER.map((k) => [k, String(s.score_weights[k] ?? DEFAULT_WEIGHTS[k])])),
  );
  const [error, setError] = useState<string | null>(null);

  const total = COMPONENT_ORDER.reduce((sum, k) => sum + (Number(weights[k]) || 0), 0);

  const mutation = useMutation({
    mutationFn: (input: SettingsUpdate) => settingsApi.update(input),
    onSuccess: (settings) => {
      setUser({ ...user, settings });
      toast("Discipline settings saved ✓");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      const apiError = toApiError(err);
      setError(apiError.fieldErrors.score_weights?.[0] ?? apiError.message);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (total === 0) return setError("At least one component needs points.");
    setError(null);
    mutation.mutate({
      wake_time: wakeTime,
      wake_grace_minutes: Number(grace),
      streak_threshold: Number(threshold),
      daily_target_score: Number(target),
      score_weights: Object.fromEntries(COMPONENT_ORDER.map((k) => [k, Math.max(0, Math.min(100, Math.round(Number(weights[k]) || 0)))])),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={error} />
      <div className={styles.row}>
        <TextField
          label="Wake-up time"
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
          hint="Tick “Wake up” by this time."
        />
        <SelectField label="Grace" value={grace} onChange={(e) => setGrace(e.target.value)} options={GRACE_OPTIONS} />
      </div>
      <div className={styles.row}>
        <SelectField
          label="Streak counts from"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          options={PERCENT_OPTIONS}
          hint="Days scoring at least this keep the streak."
        />
        <SelectField
          label="Daily target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          options={PERCENT_OPTIONS}
        />
      </div>

      <fieldset className={styles.weights}>
        <legend className={styles.weightsLegend}>Points per part of the day</legend>
        {COMPONENT_ORDER.map((key) => (
          <label key={key} className={styles.weightRow}>
            <span>{COMPONENT_LABELS[key]}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => setWeights((w) => ({ ...w, [key]: e.target.value }))}
            />
          </label>
        ))}
        <p className={styles.weightTotal}>
          Total {total}
          {total !== 100 && " — fine: scores are always scaled to 100"}
        </p>
        <button type="button" className={styles.reset} onClick={() => setWeights(Object.fromEntries(COMPONENT_ORDER.map((k) => [k, String(DEFAULT_WEIGHTS[k])])))}>
          Reset to recommended
        </button>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" loading={mutation.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
