import { Pause, Pencil, Pin, PinOff, Play, Trash2, Undo2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { TextField } from "../../../components/ui/Field";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { cn } from "../../../utils/cn";
import { formatDay } from "../../../utils/time";
import { describeDeadline, formatAmount, formatNumber, formatProgress } from "../constants";
import { useDeleteGoal, useGoalProgress, useLogGoal, useSaveGoal, useToggleMainGoal, useUndoGoalProgress } from "../hooks";
import type { Goal } from "../types";
import { GoalForm } from "./GoalForm";
import styles from "./Goals.module.css";

const DURATION_CHIPS = [
  { label: "+15 min", hours: 0.25 },
  { label: "+30 min", hours: 0.5 },
  { label: "+1 h", hours: 1 },
  { label: "+2 h", hours: 2 },
];

function LogForm({ goal }: { goal: Goal }) {
  const { toast } = useToast();
  const log = useLogGoal();
  const [mode, setMode] = useState<"add" | "set">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send(value: number, sendMode: "add" | "set") {
    log.mutate(
      { id: goal.id, input: { amount: value, mode: sendMode, note } },
      {
        onSuccess: (updated) => {
          setAmount("");
          setNote("");
          toast(updated.status === "completed" ? `Goal achieved 🎉` : `Logged — ${formatProgress(updated)}`);
        },
        onError: (err) => setError(toApiError(err).fieldErrors.amount?.[0] ?? toApiError(err).message),
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (amount.trim() === "" || Number.isNaN(value)) return setError("Enter an amount.");
    setError(null);
    send(value, mode);
  }

  if (goal.measure === "boolean") {
    const done = goal.current_value >= 1;
    return (
      <Button size="lg" block variant={done ? "secondary" : "primary"} onClick={() => send(done ? 0 : 1, "set")} loading={log.isPending}>
        {done ? "Mark as not done" : "Mark as done"}
      </Button>
    );
  }

  return (
    <form className={styles.logForm} onSubmit={handleSubmit} noValidate>
      {goal.measure === "duration" && (
        <div className={styles.chips}>
          {DURATION_CHIPS.map((chip) => (
            <button key={chip.label} type="button" className={styles.chip} onClick={() => send(chip.hours, "add")} disabled={log.isPending}>
              {chip.label}
            </button>
          ))}
        </div>
      )}
      <SegmentedControl
        legend="Log mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Add" },
          { value: "set", label: "Set total" },
        ]}
      />
      <div className={styles.row}>
        <TextField
          label={mode === "add" ? `Amount${goal.measure === "duration" ? " (hours)" : ""}` : "New total"}
          type="number"
          inputMode="decimal"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error ?? undefined}
          hint={mode === "add" ? "Use a minus sign to subtract." : undefined}
        />
        <TextField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" block loading={log.isPending}>
        Log progress
      </Button>
    </form>
  );
}

function History({ goal }: { goal: Goal }) {
  const { toast } = useToast();
  const { data } = useGoalProgress(goal.id);
  const undo = useUndoGoalProgress();
  if (!data?.length) return null;

  return (
    <section className={styles.history} aria-labelledby="goal-history">
      <h3 id="goal-history">History</h3>
      <ul>
        {data.map((entry) => (
          <li key={entry.id}>
            <span className={styles.historyDate}>{formatDay(entry.date, { month: "short", day: "numeric" })}</span>
            <span className={cn(styles.historyDelta, entry.delta < 0 && styles.negative)}>
              {entry.delta >= 0 ? "+" : "−"}
              {goal.measure === "boolean" ? (entry.delta >= 0 ? "Done" : "Undone") : formatAmount(goal, Math.abs(entry.delta))}
            </span>
            <span className={styles.historyNote}>{entry.note}</span>
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Undo entry from ${entry.date}`}
              onClick={() => undo.mutate(entry.id, { onSuccess: () => toast("Entry undone") })}
              disabled={undo.isPending}
            >
              <Undo2 size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sheet content for one goal: log progress, see history, and manage it. */
export function GoalDetails({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const toggleMain = useToggleMainGoal();
  const deadline = describeDeadline(goal.days_left);
  const fail = (error: unknown) => toast(toApiError(error).message, "error");

  if (editing) return <GoalForm goal={goal} onDone={() => setEditing(false)} />;

  return (
    <div className={styles.details}>
      <div className={styles.summary}>
        <p className={styles.big}>{formatProgress(goal)}</p>
        <div className={styles.bar} aria-hidden>
          <span style={{ width: `${goal.progress_pct}%` }} />
        </div>
        <p className={styles.summaryMeta}>
          {goal.progress_pct}% complete
          {goal.measure !== "boolean" && goal.status !== "completed" && goal.target_value > goal.current_value && (
            <> · {formatAmount(goal, goal.target_value - goal.current_value)} to go</>
          )}
          {deadline && goal.status !== "completed" && <> · {deadline.text}</>}
        </p>
        {goal.description && <p className={styles.why}>{goal.description}</p>}
      </div>

      {goal.status !== "paused" && <LogForm goal={goal} />}

      <History goal={goal} />

      <div className={styles.actions}>
        <Button
          variant="secondary"
          icon={goal.is_main ? <PinOff size={18} aria-hidden /> : <Pin size={18} aria-hidden />}
          onClick={() =>
            toggleMain.mutate(goal.id, {
              onSuccess: (g) => toast(g.is_main ? "Pinned to Today ✓" : "Unpinned from Today"),
              onError: fail,
            })
          }
        >
          {goal.is_main ? "Unpin from Today" : "Pin to Today"}
        </Button>
        {goal.status !== "completed" && (
          <Button
            variant="secondary"
            icon={goal.status === "paused" ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
            onClick={() =>
              save.mutate(
                { id: goal.id, input: { status: goal.status === "paused" ? "in_progress" : "paused" } },
                { onSuccess: (g) => toast(g.status === "paused" ? "Goal paused" : "Goal resumed ✓"), onError: fail },
              )
            }
          >
            {goal.status === "paused" ? "Resume" : "Pause"}
          </Button>
        )}
        <Button variant="secondary" icon={<Pencil size={18} aria-hidden />} onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="danger" icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${goal.title}"?`}
        message={`This removes the goal and its progress history (${formatNumber(goal.current_value)} logged so far).`}
        confirmLabel="Delete goal"
        onConfirm={() =>
          remove.mutate(goal.id, {
            onSuccess: () => {
              toast("Goal deleted");
              onClose();
            },
            onError: fail,
          })
        }
        onCancel={() => setConfirmDelete(false)}
        busy={remove.isPending}
      />
    </div>
  );
}
