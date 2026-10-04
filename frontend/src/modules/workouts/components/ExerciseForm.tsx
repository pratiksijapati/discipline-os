import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import type { FieldErrors } from "../../../types/api";
import { formatDay } from "../../../utils/time";
import { describeSet, EXERCISE_CATEGORY_OPTIONS, MEASURE_OPTIONS } from "../constants";
import { useDeleteExercise, useExerciseHistory, useSaveExercise } from "../hooks";
import type { Exercise, ExerciseCategory, Measure } from "../types";
import styles from "./Workout.module.css";

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

function History({ exerciseId }: { exerciseId: number }) {
  const { data } = useExerciseHistory(exerciseId);
  if (!data?.length) return null;
  return (
    <section className={styles.history} aria-labelledby="exercise-history">
      <h3 id="exercise-history">Recent progress</h3>
      <ul>
        {data.slice(0, 6).map((entry) => (
          <li key={entry.session_id}>
            <span>{formatDay(entry.date, { month: "short", day: "numeric" })}</span>
            <span>{entry.sets.map(describeSet).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExerciseForm({ exercise, onDone }: { exercise?: Exercise; onDone: () => void }) {
  const { toast } = useToast();
  const save = useSaveExercise();
  const remove = useDeleteExercise();

  const [name, setName] = useState(exercise?.name ?? "");
  const [measure, setMeasure] = useState<Measure>(exercise?.measure ?? "reps");
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? "strength");
  const [sets, setSets] = useState(str(exercise?.default_sets ?? 3));
  const [reps, setReps] = useState(str(exercise?.default_reps ?? 10));
  const [seconds, setSeconds] = useState(str(exercise?.default_duration_seconds ?? 60));
  const [weight, setWeight] = useState(str(exercise?.default_weight_kg));
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setErrors({ name: ["Give the exercise a name."] });
    setErrors({});
    setFormError(null);
    const input = {
      name: name.trim(),
      measure,
      category,
      instructions,
      default_sets: Math.max(1, Number(sets) || 1),
      default_reps: measure === "reps" ? num(reps) : null,
      default_duration_seconds: measure === "time" ? num(seconds) : null,
      default_weight_kg: measure === "reps" ? num(weight) : null,
    };
    try {
      await save.mutateAsync({ id: exercise?.id, input });
      toast(exercise ? "Exercise saved ✓" : "Exercise added ✓");
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      if (Object.keys(apiError.fieldErrors).length === 0) setFormError(apiError.message);
    }
  }

  async function toggleArchive() {
    if (!exercise) return;
    try {
      await save.mutateAsync({ id: exercise.id, input: { is_active: !exercise.is_active } });
      toast(exercise.is_active ? "Exercise archived" : "Exercise restored ✓");
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  async function handleDelete() {
    if (!exercise) return;
    try {
      await remove.mutateAsync(exercise.id);
      toast("Exercise deleted");
      onDone();
    } catch (error) {
      setConfirmDelete(false);
      toast(toApiError(error).message, "error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField label="Exercise" placeholder="e.g. Bench Press" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className={styles.group}>
        <span className={styles.legend}>Measured in</span>
        <SegmentedControl legend="Measured in" value={measure} options={MEASURE_OPTIONS} onChange={setMeasure} />
      </div>
      <SelectField
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
        options={EXERCISE_CATEGORY_OPTIONS}
      />
      <div className={styles.triple}>
        <TextField label="Sets" type="number" inputMode="numeric" min={1} value={sets} onChange={(e) => setSets(e.target.value)} />
        {measure === "reps" ? (
          <>
            <TextField label="Reps" type="number" inputMode="numeric" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
            <TextField
              label="kg"
              optional
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </>
        ) : (
          <TextField label="Seconds" type="number" inputMode="numeric" min={1} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        )}
      </div>
      <TextAreaField label="How to do it" optional value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <Button type="submit" size="lg" block loading={save.isPending}>
        {exercise ? "Save exercise" : "Add exercise"}
      </Button>

      {exercise && (
        <>
          <History exerciseId={exercise.id} />
          <div className={styles.dangerRow}>
            <Button
              variant="secondary"
              icon={exercise.is_active ? <Archive size={18} aria-hidden /> : <ArchiveRestore size={18} aria-hidden />}
              onClick={() => void toggleArchive()}
            >
              {exercise.is_active ? "Archive" : "Restore"}
            </Button>
            <Button variant="danger" icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${exercise?.name ?? ""}"?`}
        message="Exercises used in a plan or past workout can't be deleted — archive them instead."
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
        busy={remove.isPending}
      />
    </form>
  );
}
