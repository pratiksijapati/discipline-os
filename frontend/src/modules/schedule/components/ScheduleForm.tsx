import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { FieldErrors } from "../../../types/api";
import type { WeekStart } from "../../../types/auth";
import type { Priority } from "../../../types/common";
import { PRIORITY_OPTIONS } from "../../../utils/priority";
import { toInputTime } from "../../../utils/time";
import { CATEGORY_OPTIONS, REPEAT_OPTIONS } from "../constants";
import { useCreateScheduleItem, useCreateTemplate, useUpdateScheduleItem, useUpdateTemplate } from "../hooks";
import type { RepeatChoice, ScheduleCategory, ScheduleItem, ScheduleTemplate } from "../types";
import { DayPicker } from "../../../components/ui/DayPicker";
import styles from "./ScheduleForm.module.css";

export type ScheduleFormMode =
  | { kind: "create"; date: string }
  | { kind: "item"; item: ScheduleItem }
  | { kind: "template"; template: ScheduleTemplate };

interface FormValues {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  category: ScheduleCategory;
  priority: Priority;
  notes: string;
  repeat: RepeatChoice;
  days_of_week: number[];
}

function initialValues(mode: ScheduleFormMode): FormValues {
  if (mode.kind === "create") {
    return {
      title: "",
      date: mode.date,
      start_time: "",
      end_time: "",
      category: "personal",
      priority: "medium",
      notes: "",
      repeat: "never",
      days_of_week: [],
    };
  }
  const source = mode.kind === "item" ? mode.item : mode.template;
  return {
    title: source.title,
    date: mode.kind === "item" ? mode.item.date : mode.template.start_date,
    start_time: toInputTime(source.start_time),
    end_time: toInputTime(source.end_time),
    category: source.category,
    priority: source.priority,
    notes: source.notes,
    repeat: mode.kind === "template" ? mode.template.repeat : "never",
    days_of_week: mode.kind === "template" ? mode.template.days_of_week : [],
  };
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.title.trim()) errors.title = ["Give it a name."];
  if (!values.date) errors.date = ["Pick a date."];
  if (!values.start_time) errors.start_time = ["Pick a start time."];
  if (values.end_time && values.start_time && values.end_time <= values.start_time) {
    errors.end_time = ["End time must be after the start time."];
  }
  if (values.repeat === "selected_days" && values.days_of_week.length === 0) {
    errors.days_of_week = ["Pick at least one day."];
  }
  return errors;
}

interface ScheduleFormProps {
  mode: ScheduleFormMode;
  weekStart: WeekStart;
  onSaved: () => void;
}

export function ScheduleForm({ mode, weekStart, onSaved }: ScheduleFormProps) {
  const { toast } = useToast();
  const [values, setValues] = useState(() => initialValues(mode));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createItem = useCreateScheduleItem();
  const updateItem = useUpdateScheduleItem();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const saving = createItem.isPending || updateItem.isPending || createTemplate.isPending || updateTemplate.isPending;

  const isRecurring = mode.kind === "template" || (mode.kind === "create" && values.repeat !== "never");
  const repeatOptions = mode.kind === "template" ? REPEAT_OPTIONS.filter((o) => o.value !== "never") : REPEAT_OPTIONS;

  function set<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const base = {
      title: values.title.trim(),
      start_time: values.start_time,
      end_time: values.end_time || null,
      category: values.category,
      priority: values.priority,
      notes: values.notes,
    };
    const rule = {
      repeat: values.repeat === "never" ? "daily" : values.repeat,
      days_of_week: values.repeat === "selected_days" ? values.days_of_week : [],
      start_date: values.date,
    } as const;

    try {
      if (mode.kind === "item") {
        await updateItem.mutateAsync({ id: mode.item.id, input: { ...base, date: values.date } });
        toast("Saved ✓");
      } else if (mode.kind === "template") {
        await updateTemplate.mutateAsync({ id: mode.template.id, input: { ...base, ...rule } });
        toast("Routine updated ✓");
      } else if (isRecurring) {
        await createTemplate.mutateAsync({ ...base, ...rule });
        toast("Added to your routine ✓");
      } else {
        await createItem.mutateAsync({ ...base, date: values.date });
        toast("Added to schedule ✓");
      }
      onSaved();
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
        label="What"
        placeholder="e.g. Workout"
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
        autoFocus={mode.kind === "create"}
      />

      <div className={styles.row}>
        <TextField
          label="Start"
          type="time"
          value={values.start_time}
          onChange={(e) => set("start_time", e.target.value)}
          error={errors.start_time}
        />
        <TextField
          label="End"
          optional
          type="time"
          value={values.end_time}
          onChange={(e) => set("end_time", e.target.value)}
          error={errors.end_time}
        />
      </div>

      {mode.kind !== "item" && (
        <SelectField
          label="Repeat"
          value={values.repeat}
          onChange={(e) => set("repeat", e.target.value as RepeatChoice)}
          options={repeatOptions}
          error={errors.repeat}
        />
      )}

      {values.repeat === "selected_days" && (
        <DayPicker
          value={values.days_of_week}
          onChange={(days) => set("days_of_week", days)}
          weekStart={weekStart}
          error={errors.days_of_week}
        />
      )}

      <TextField
        label={isRecurring ? "Starting from" : "Date"}
        type="date"
        value={values.date}
        onChange={(e) => set("date", e.target.value)}
        error={errors.date ?? errors.start_date}
      />

      <div className={styles.row}>
        <SelectField
          label="Category"
          value={values.category}
          onChange={(e) => set("category", e.target.value as ScheduleCategory)}
          options={CATEGORY_OPTIONS}
        />
        <SelectField
          label="Priority"
          value={values.priority}
          onChange={(e) => set("priority", e.target.value as Priority)}
          options={PRIORITY_OPTIONS}
        />
      </div>

      <TextAreaField label="Notes" optional value={values.notes} onChange={(e) => set("notes", e.target.value)} />

      {mode.kind === "template" && (
        <p className={styles.note}>Changes apply to upcoming days. Days you've already completed keep their history.</p>
      )}

      <Button type="submit" size="lg" block loading={saving}>
        {mode.kind === "create" ? (isRecurring ? "Add to routine" : "Add to schedule") : "Save changes"}
      </Button>
    </form>
  );
}
