import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { DayPicker } from "../../../components/ui/DayPicker";
import { SelectField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import type { FieldErrors } from "../../../types/api";
import type { WeekStart } from "../../../types/auth";
import { FREQUENCY_OPTIONS, HABIT_CATEGORY_OPTIONS, HABIT_TYPE_OPTIONS } from "../constants";
import { useCreateHabit, useDeleteHabit, useUpdateHabit } from "../hooks";
import type { Habit, HabitCategory, HabitFrequency, HabitType } from "../types";
import styles from "./HabitForm.module.css";

const WEEKLY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n}× per week` }));

interface HabitFormProps {
  habit?: Habit;
  weekStart: WeekStart;
  onDone: () => void;
}

export function HabitForm({ habit, weekStart, onDone }: HabitFormProps) {
  const { toast } = useToast();
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const remove = useDeleteHabit();

  const [name, setName] = useState(habit?.name ?? "");
  const [habitType, setHabitType] = useState<HabitType>(habit?.habit_type ?? "boolean");
  const [target, setTarget] = useState(String(habit && habit.habit_type !== "boolean" ? habit.target_value : ""));
  const [unit, setUnit] = useState(habit?.unit ?? "");
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? "daily");
  const [days, setDays] = useState<number[]>(habit?.days_of_week ?? []);
  const [weekly, setWeekly] = useState(String(habit?.weekly_target ?? 3));
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? "health");
  const [points, setPoints] = useState(String(habit?.points ?? 1));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validate(): FieldErrors {
    const result: FieldErrors = {};
    if (!name.trim()) result.name = ["Give the habit a name."];
    if (habitType !== "boolean" && !(Number(target) >= 1)) result.target_value = ["Set a target of at least 1."];
    if (habitType === "quantity" && !unit.trim()) result.unit = ["e.g. glasses, pages"];
    if (frequency === "selected_days" && days.length === 0) result.days_of_week = ["Pick at least one day."];
    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = {
      name: name.trim(),
      habit_type: habitType,
      target_value: habitType === "boolean" ? 1 : Number(target),
      unit: habitType === "duration" ? "min" : unit.trim(),
      frequency,
      days_of_week: frequency === "selected_days" ? days : [],
      weekly_target: frequency === "weekly_target" ? Number(weekly) : null,
      category,
      points: Math.max(0, Number(points) || 0),
    };
    try {
      if (habit) {
        await update.mutateAsync({ id: habit.id, input });
        toast("Habit updated ✓");
      } else {
        await create.mutateAsync(input);
        toast("Habit created ✓");
      }
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      if (Object.keys(apiError.fieldErrors).length === 0) setFormError(apiError.message);
    }
  }

  async function toggleArchive() {
    if (!habit) return;
    try {
      await update.mutateAsync({ id: habit.id, input: { is_active: !habit.is_active } });
      toast(habit.is_active ? "Habit archived — history kept" : "Habit restored ✓");
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  async function handleDelete() {
    if (!habit) return;
    try {
      await remove.mutateAsync(habit.id);
      toast("Habit deleted");
      setConfirmDelete(false);
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField
        label="Habit"
        placeholder="e.g. Drink water"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        autoFocus={!habit}
      />

      <div className={styles.group}>
        <span className={styles.groupLabel}>How do you track it?</span>
        <SegmentedControl legend="Habit type" value={habitType} options={HABIT_TYPE_OPTIONS} onChange={setHabitType} />
      </div>

      {habitType === "quantity" && (
        <div className={styles.row}>
          <TextField
            label="Daily target"
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={errors.target_value}
          />
          <TextField label="Unit" placeholder="glasses" value={unit} onChange={(e) => setUnit(e.target.value)} error={errors.unit} />
        </div>
      )}
      {habitType === "duration" && (
        <TextField
          label="Daily target (minutes)"
          type="number"
          inputMode="numeric"
          min={1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target_value}
        />
      )}

      <SelectField
        label="How often"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
        options={FREQUENCY_OPTIONS}
      />
      {frequency === "selected_days" && (
        <DayPicker value={days} onChange={setDays} weekStart={weekStart} legend="On these days" error={errors.days_of_week} />
      )}
      {frequency === "weekly_target" && (
        <SelectField
          label="Weekly target"
          value={weekly}
          onChange={(e) => setWeekly(e.target.value)}
          options={WEEKLY_OPTIONS}
          error={errors.weekly_target}
        />
      )}

      <div className={styles.row}>
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as HabitCategory)}
          options={HABIT_CATEGORY_OPTIONS}
        />
        <TextField
          label="Points"
          type="number"
          inputMode="numeric"
          min={0}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          error={errors.points}
        />
      </div>

      <Button type="submit" size="lg" block loading={create.isPending || update.isPending}>
        {habit ? "Save habit" : "Create habit"}
      </Button>

      {habit && (
        <div className={styles.danger}>
          <Button
            variant="secondary"
            icon={habit.is_active ? <Archive size={18} aria-hidden /> : <ArchiveRestore size={18} aria-hidden />}
            onClick={() => void toggleArchive()}
          >
            {habit.is_active ? "Archive" : "Restore"}
          </Button>
          <Button variant="danger" icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${habit?.name ?? ""}"?`}
        message="This removes the habit and its entire history. To stop tracking but keep history, archive it instead."
        confirmLabel="Delete forever"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
        busy={remove.isPending}
      />
    </form>
  );
}
