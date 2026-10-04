import { ArrowDown, ArrowUp, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { DayPicker } from "../../../components/ui/DayPicker";
import { SelectField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { FieldErrors } from "../../../types/api";
import type { WeekStart } from "../../../types/auth";
import { useDeletePlan, useExercises, useSavePlan } from "../hooks";
import type { Exercise, Measure, WorkoutPlan } from "../types";
import styles from "./Workout.module.css";

interface Row {
  key: number;
  exercise: number;
  name: string;
  measure: Measure;
  sets: string;
  reps: string;
  seconds: string;
  weight: string;
}

let nextKey = 1;
const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

function rowFromExercise(e: Exercise): Row {
  return {
    key: nextKey++,
    exercise: e.id,
    name: e.name,
    measure: e.measure,
    sets: str(e.default_sets),
    reps: str(e.default_reps),
    seconds: str(e.default_duration_seconds),
    weight: str(e.default_weight_kg),
  };
}

interface PlanFormProps {
  plan?: WorkoutPlan;
  weekStart: WeekStart;
  onDone: () => void;
}

export function PlanForm({ plan, weekStart, onDone }: PlanFormProps) {
  const { toast } = useToast();
  const save = useSavePlan();
  const remove = useDeletePlan();
  const library = useExercises();

  const [name, setName] = useState(plan?.name ?? "");
  const [days, setDays] = useState<number[]>(plan?.days_of_week ?? []);
  const [rows, setRows] = useState<Row[]>(() =>
    (plan?.exercises ?? []).map((r) => ({
      key: nextKey++,
      exercise: r.exercise,
      name: r.exercise_name,
      measure: r.measure,
      sets: str(r.target_sets),
      reps: str(r.target_reps),
      seconds: str(r.target_duration_seconds),
      weight: str(r.target_weight_kg),
    })),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const available = (library.data ?? []).filter((e) => e.is_active);

  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = ["Give the plan a name."];
    if (rows.length === 0) nextErrors.exercises = ["Add at least one exercise."];
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = {
      name: name.trim(),
      days_of_week: days,
      exercises: rows.map((r) => ({
        exercise: r.exercise,
        target_sets: Math.max(1, Number(r.sets) || 1),
        target_reps: r.measure === "reps" ? num(r.reps) : null,
        target_duration_seconds: r.measure === "time" ? num(r.seconds) : null,
        target_weight_kg: r.measure === "reps" ? num(r.weight) : null,
      })),
    };
    try {
      await save.mutateAsync({ id: plan?.id, input });
      toast(plan ? "Plan saved ✓" : "Plan created ✓");
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      if (Object.keys(apiError.fieldErrors).length === 0) setFormError(apiError.message);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    try {
      await remove.mutateAsync(plan.id);
      toast("Plan deleted");
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField label="Plan name" placeholder="e.g. Push Day" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <DayPicker value={days} onChange={setDays} weekStart={weekStart} legend="Workout days (optional)" />

      <fieldset className={styles.rowsBox}>
        <legend className={styles.legend}>Exercises</legend>
        {rows.length === 0 && <p className={styles.hint}>No exercises yet — add one below.</p>}
        <ol className={styles.rows}>
          {rows.map((row, index) => (
            <li key={row.key} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.rowName}>{row.name}</span>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${row.name} up`}>
                  <ArrowUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`Move ${row.name} down`}
                >
                  <ArrowDown size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setRows((c) => c.filter((r) => r.key !== row.key))}
                  aria-label={`Remove ${row.name}`}
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className={styles.rowInputs}>
                <label>
                  <span>Sets</span>
                  <input type="number" inputMode="numeric" min={1} value={row.sets} onChange={(e) => update(row.key, { sets: e.target.value })} />
                </label>
                {row.measure === "time" ? (
                  <label>
                    <span>Seconds</span>
                    <input type="number" inputMode="numeric" min={1} value={row.seconds} onChange={(e) => update(row.key, { seconds: e.target.value })} />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Reps</span>
                      <input type="number" inputMode="numeric" min={1} value={row.reps} onChange={(e) => update(row.key, { reps: e.target.value })} />
                    </label>
                    <label>
                      <span>kg</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.5}
                        placeholder="—"
                        value={row.weight}
                        onChange={(e) => update(row.key, { weight: e.target.value })}
                      />
                    </label>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
        {errors.exercises && <p className={styles.error}>{errors.exercises[0]}</p>}
        <SelectField
          label="Add exercise"
          value=""
          onChange={(e) => {
            const exercise = available.find((x) => x.id === Number(e.target.value));
            if (exercise) setRows((c) => [...c, rowFromExercise(exercise)]);
          }}
          options={[
            { value: "", label: available.length ? "Choose an exercise…" : "Create exercises first" },
            ...available.map((e) => ({ value: String(e.id), label: e.name })),
          ]}
        />
      </fieldset>

      <Button type="submit" size="lg" block loading={save.isPending}>
        {plan ? "Save plan" : "Create plan"}
      </Button>
      {plan && (
        <Button variant="danger" block icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmDelete(true)}>
          Delete plan
        </Button>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${plan?.name ?? ""}"?`}
        message="The plan is removed. Workouts you've already done with it stay in your history."
        confirmLabel="Delete plan"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
        busy={remove.isPending}
      />
    </form>
  );
}
