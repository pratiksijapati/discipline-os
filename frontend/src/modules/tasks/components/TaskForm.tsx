import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { SelectField, TextAreaField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { FieldErrors } from "../../../types/api";
import type { Priority } from "../../../types/common";
import { PRIORITY_OPTIONS } from "../../../utils/priority";
import { toInputTime } from "../../../utils/time";
import { TASK_CATEGORY_OPTIONS } from "../constants";
import { useCreateTask, useDeleteTask, useUpdateTask } from "../hooks";
import type { Task, TaskCategory } from "../types";
import styles from "./TaskForm.module.css";
import { kindHint } from "../../quickadd/kinds";

interface TaskFormProps {
  /** Edit this task, or create a new one when omitted. */
  task?: Task;
  defaultDueDate?: string;
  onDone: () => void;
}

export function TaskForm({ task, defaultDueDate = "", onDone }: TaskFormProps) {
  const { toast } = useToast();
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();

  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task ? (task.due_date ?? "") : defaultDueDate);
  const [dueTime, setDueTime] = useState(toInputTime(task?.due_time));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [category, setCategory] = useState<TaskCategory>(task?.category ?? "personal");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = ["Give the task a title."];
    if (dueTime && !dueDate) nextErrors.due_time = ["Pick a date to set a time."];
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const input = {
      title: title.trim(),
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority,
      category,
      notes,
    };
    try {
      if (task) {
        await update.mutateAsync({ id: task.id, input });
        toast("Task saved ✓");
      } else {
        await create.mutateAsync(input);
        toast("Task added ✓");
      }
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      if (Object.keys(apiError.fieldErrors).length === 0) setFormError(apiError.message);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      await remove.mutateAsync(task.id);
      toast("Task deleted");
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={formError} />
      <TextField
        label="Task"
        placeholder="What needs doing?"
        hint={task ? undefined : kindHint("task")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        autoFocus={!task}
        enterKeyHint="done"
      />
      <div className={styles.row}>
        <TextField
          label="Due date"
          optional
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={errors.due_date}
        />
        <TextField
          label="Time"
          optional
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          error={errors.due_time}
        />
      </div>
      <div className={styles.row}>
        <SelectField
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          options={PRIORITY_OPTIONS}
          hint={priority === "high" || priority === "critical" ? "Counts as an important task." : undefined}
        />
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TaskCategory)}
          options={TASK_CATEGORY_OPTIONS}
        />
      </div>
      <TextAreaField label="Notes" optional value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" size="lg" block loading={create.isPending || update.isPending}>
        {task ? "Save task" : "Add task"}
      </Button>
      {task && (
        <Button variant="danger" block icon={<Trash2 size={18} aria-hidden />} onClick={handleDelete} loading={remove.isPending}>
          Delete task
        </Button>
      )}
    </form>
  );
}
