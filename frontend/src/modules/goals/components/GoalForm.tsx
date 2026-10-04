import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { FieldErrors } from "../../../types/api";
import type { Priority } from "../../../types/common";
import { PRIORITY_OPTIONS } from "../../../utils/priority";
import { GOAL_CATEGORY_OPTIONS, MEASURE_OPTIONS } from "../constants";
import { useSaveGoal } from "../hooks";
import type { Goal, GoalCategory, GoalMeasure } from "../types";
import styles from "./Goals.module.css";

const UNIT_PLACEHOLDER: Partial<Record<GoalMeasure, string>> = {
  count: "e.g. books, workouts",
  number: "e.g. km, pages",
  currency: "NPR",
};

export function GoalForm({ goal, onDone }: { goal?: Goal; onDone: (saved: Goal) => void }) {
  const { toast } = useToast();
  const save = useSaveGoal();

  const [title, setTitle] = useState(goal?.title ?? "");
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? "other");
  const [measure, setMeasure] = useState<GoalMeasure>(goal?.measure ?? "count");
  const [target, setTarget] = useState(goal ? String(goal.target_value) : "");
  const [unit, setUnit] = useState(goal?.unit ?? "");
  const [startValue, setStartValue] = useState("");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [priority, setPriority] = useState<Priority>(goal?.priority ?? "medium");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const needsTarget = measure !== "boolean" && measure !== "percentage";
  const needsUnit = measure === "count" || measure === "number" || measure === "currency";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = ["Give the goal a title."];
    if (needsTarget && !(Number(target) > 0)) nextErrors.target_value = ["Set a target above 0."];
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = {
      title: title.trim(),
      category,
      measure,
      priority,
      description,
      deadline: deadline || null,
      ...(needsTarget ? { target_value: Number(target) } : {}),
      ...(needsUnit ? { unit: unit.trim() } : {}),
      ...(!goal && startValue.trim() !== "" ? { current_value: Number(startValue) } : {}),
    };
    try {
      const saved = await save.mutateAsync({ id: goal?.id, input });
      toast(goal ? "Goal saved ✓" : "Goal created ✓");
      onDone(saved);
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      if (Object.keys(apiError.fieldErrors).length === 0) setFormError(apiError.message);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField
        label="Goal"
        placeholder="e.g. Learn React"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        autoFocus={!goal}
      />
      <SelectField
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value as GoalCategory)}
        options={GOAL_CATEGORY_OPTIONS}
      />
      <SelectField
        label="Measure progress as"
        value={measure}
        onChange={(e) => setMeasure(e.target.value as GoalMeasure)}
        options={MEASURE_OPTIONS}
      />

      {needsTarget && (
        <div className={styles.row}>
          <TextField
            label={measure === "duration" ? "Target (hours)" : "Target"}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={errors.target_value}
          />
          {needsUnit ? (
            <TextField
              label="Unit"
              optional={measure !== "currency"}
              placeholder={UNIT_PLACEHOLDER[measure]}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              error={errors.unit}
            />
          ) : (
            <span />
          )}
        </div>
      )}

      {!goal && measure !== "boolean" && (
        <TextField
          label="Already done"
          optional
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          placeholder="0"
          value={startValue}
          onChange={(e) => setStartValue(e.target.value)}
          hint="Progress you've made before today."
          error={errors.current_value}
        />
      )}

      <div className={styles.row}>
        <TextField
          label="Deadline"
          optional
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          error={errors.deadline}
        />
        <SelectField
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          options={PRIORITY_OPTIONS}
        />
      </div>
      <TextAreaField
        label="Why it matters"
        optional
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button type="submit" size="lg" block loading={save.isPending}>
        {goal ? "Save goal" : "Create goal"}
      </Button>
    </form>
  );
}
