import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/Field";
import { Switch } from "../../../components/ui/Switch";
import { cn } from "../../../utils/cn";
import {
  useAddRoutineStep,
  useRemoveRoutineStep,
  useRenameRoutine,
  useReorderRoutine,
  useUpdateRoutineStep,
} from "../hooks";
import type { Routine } from "../types";
import styles from "./Routine.module.css";

/** Edit one routine: rename, add, rename steps, turn steps on/off, reorder, delete. */
export function RoutineEditor({ routine }: { routine: Routine }) {
  const { toast } = useToast();
  const rename = useRenameRoutine();
  const reorder = useReorderRoutine();
  const addStep = useAddRoutineStep();
  const updateStep = useUpdateRoutineStep();
  const removeStep = useRemoveRoutineStep();

  const [name, setName] = useState(routine.name);
  const [newStep, setNewStep] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const steps = routine.items;
  const enabledCount = steps.filter((s) => s.is_enabled).length;

  const fail = (error: unknown) => toast(toApiError(error).message, "error");

  function move(index: number, direction: -1 | 1) {
    const ids = steps.map((s) => s.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate({ id: routine.id, itemIds: ids }, { onError: fail });
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newStep.trim();
    if (!title) return;
    try {
      await addStep.mutateAsync({ routineId: routine.id, title });
      setNewStep("");
    } catch (error) {
      fail(error);
    }
  }

  async function saveTitle(stepId: number) {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title) return;
    updateStep.mutate({ id: stepId, input: { title } }, { onError: fail });
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === routine.name) return setName(routine.name);
    try {
      await rename.mutateAsync({ id: routine.id, name: trimmed });
      toast("Renamed ✓");
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className={styles.editor}>
      <TextField label="Routine name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void saveName()} />

      <p className={styles.editorHint}>
        {enabledCount} of {steps.length} steps on. Switched-off steps are hidden from your daily checklist.
      </p>

      <ol className={styles.editList}>
        {steps.map((step, index) => (
          <li key={step.id} className={cn(styles.editRow, !step.is_enabled && styles.disabledRow)}>
            <div className={styles.order}>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${step.title} up`}>
                <ArrowUp size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === steps.length - 1}
                aria-label={`Move ${step.title} down`}
              >
                <ArrowDown size={16} aria-hidden />
              </button>
            </div>

            {editingId === step.id ? (
              <input
                className={styles.inlineInput}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => void saveTitle(step.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditingId(null);
                }}
                aria-label={`Rename ${step.title}`}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className={styles.stepName}
                onClick={() => {
                  setEditingId(step.id);
                  setEditingTitle(step.title);
                }}
              >
                {step.title}
                <Pencil size={14} aria-hidden />
              </button>
            )}

            <Switch
              checked={step.is_enabled}
              onChange={(checked) => updateStep.mutate({ id: step.id, input: { is_enabled: checked } }, { onError: fail })}
              label={`${step.title} enabled`}
            />
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => removeStep.mutate(step.id, { onError: fail, onSuccess: () => toast("Step removed") })}
              aria-label={`Delete ${step.title}`}
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      <form className={styles.addRow} onSubmit={handleAdd}>
        <input
          className={styles.inlineInput}
          placeholder="Add a step, e.g. Stretch"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          aria-label="New step"
          enterKeyHint="done"
        />
        <Button type="submit" icon={<Plus size={18} aria-hidden />} loading={addStep.isPending} disabled={!newStep.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}
