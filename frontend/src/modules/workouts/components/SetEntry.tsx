import { Check, Timer } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/Button";
import type { FieldErrors } from "../../../types/api";
import { formatClock } from "../../../utils/duration";
import type { SessionExercise, SetInput } from "../types";
import { buzz, useCountdown } from "../useElapsed";
import styles from "./LiveSession.module.css";

interface SetEntryProps {
  row: SessionExercise;
  onSubmit: (input: SetInput) => void;
  busy: boolean;
  disabled: boolean;
  errors: FieldErrors;
}

/**
 * Inputs for the next set, pre-filled from the last set (or the target),
 * so most sets are a single tap on "Complete set".
 * Remount with a new `key` after each set to refresh the defaults.
 */
export function SetEntry({ row, onSubmit, busy, disabled, errors }: SetEntryProps) {
  const last = row.sets.at(-1);
  const [weight, setWeight] = useState(String(last?.weight_kg ?? row.target_weight_kg ?? ""));
  const [reps, setReps] = useState(String(last?.reps ?? row.target_reps ?? ""));
  const [seconds, setSeconds] = useState(String(last?.duration_seconds ?? row.target_duration_seconds ?? ""));
  const [timerUntil, setTimerUntil] = useState<number | null>(null);
  const remaining = useCountdown(timerUntil, () => {
    buzz();
    setTimerUntil(null);
  });
  const isTime = row.measure === "time";
  const nextNumber = row.sets.length + 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isTime) {
      onSubmit({ session_exercise: row.id, duration_seconds: Number(seconds) || null });
    } else {
      onSubmit({
        session_exercise: row.id,
        reps: Number(reps) || null,
        weight_kg: weight === "" ? null : Number(weight),
      });
    }
  }

  const fieldError = (name: string) =>
    errors[name]?.[0] ? (
      <span className={styles.inputError} role="alert">
        {errors[name][0]}
      </span>
    ) : null;

  return (
    <form className={styles.entry} onSubmit={handleSubmit} noValidate>
      <p className={styles.entryLabel}>Set {nextNumber}</p>
      {isTime ? (
        <div className={styles.inputs}>
          <label className={styles.input}>
            <span>Seconds</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
            {fieldError("duration_seconds")}
          </label>
          <Button
            variant="secondary"
            icon={<Timer size={18} aria-hidden />}
            onClick={() => setTimerUntil(timerUntil ? null : Date.now() + (Number(seconds) || 60) * 1000)}
            aria-live="polite"
          >
            {remaining !== null ? formatClock(remaining) : "Start timer"}
          </Button>
        </div>
      ) : (
        <div className={styles.inputs}>
          <label className={styles.input}>
            <span>Weight (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            {fieldError("weight_kg")}
          </label>
          <label className={styles.input}>
            <span>Reps</span>
            <input type="number" inputMode="numeric" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
            {fieldError("reps")}
          </label>
        </div>
      )}
      <Button type="submit" size="lg" block icon={<Check size={20} aria-hidden />} loading={busy} disabled={disabled}>
        Complete set {nextNumber}
      </Button>
    </form>
  );
}
