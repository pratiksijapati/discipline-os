import { Feather, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { CheckButton } from "../../../components/ui/CheckButton";
import { TextField } from "../../../components/ui/Field";
import { Sheet } from "../../../components/ui/Sheet";
import { cn } from "../../../utils/cn";
import { MINIMUM_REASONS, MINIMUM_SUGGESTIONS, PROTECTED_PER_WEEK } from "../constants";
import { useCheckMinimumStep, useSetMinimumChecklist, useStartMinimumDay, useStopMinimumDay } from "../hooks";
import type { MinimumDayState } from "../types";
import styles from "./MinimumDay.module.css";

const MAX_STEPS = 10;

/** On Today: the Minimum Day checklist when it's on, otherwise a quiet way to switch to one. */
export function MinimumDay({ state }: { state: MinimumDayState }) {
  const [sheet, setSheet] = useState<"start" | "edit" | null>(null);
  return (
    <>
      {state.active ? (
        <ActiveCard state={state} onEdit={() => setSheet("edit")} />
      ) : (
        <button type="button" className={styles.switch} onClick={() => setSheet("start")}>
          <Feather size={16} aria-hidden /> Hard day? Switch to a minimum day
        </button>
      )}
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === "edit" ? "Minimum day list" : "Minimum day"}>
        {sheet === "start" && <StartPanel state={state} onDone={() => setSheet(null)} />}
        {sheet === "edit" && (
          <ChecklistEditor initial={state.checklist.items.map((i) => i.title)} onSaved={() => setSheet(null)} />
        )}
      </Sheet>
    </>
  );
}

function ActiveCard({ state, onEdit }: { state: MinimumDayState; onEdit: () => void }) {
  const { toast } = useToast();
  const check = useCheckMinimumStep();
  const stop = useStopMinimumDay();
  const { items, completed, total } = state.checklist;
  const done = total > 0 && completed === total;

  return (
    <section className={cn(styles.card, done && styles.cardDone)} aria-labelledby="minimum-heading">
      <div className={styles.head}>
        <p id="minimum-heading" className={styles.label}>
          Minimum day{state.reason && ` · ${state.reason}`}
        </p>
        <span className={styles.count}>{done ? "Done ✓" : `${completed} / ${total}`}</span>
      </div>
      <p className={styles.sub}>
        {done ? "That's the minimum — well kept. Anything more today is a bonus." : "Keep it small. Finish these and your streak holds."}
      </p>
      <ol className={styles.steps}>
        {items.map((step) => (
          <li key={step.id} className={cn(styles.step, step.done && styles.stepDone)}>
            <CheckButton
              checked={step.done}
              onToggle={() => check.mutate({ stepId: step.id, done: !step.done })}
              label={step.done ? `Untick ${step.title}` : `Tick ${step.title}`}
            />
            <span>{step.title}</span>
          </li>
        ))}
      </ol>
      <div className={styles.links}>
        <button type="button" className={styles.textButton} onClick={onEdit}>
          Edit list
        </button>
        <button
          type="button"
          className={styles.textButton}
          disabled={stop.isPending}
          onClick={() =>
            stop.mutate(undefined, {
              onSuccess: () => toast("Back to a normal day"),
              onError: (error) => toast(toApiError(error).message, "error"),
            })
          }
        >
          Back to a normal day
        </button>
      </div>
    </section>
  );
}

function StartPanel({ state, onDone }: { state: MinimumDayState; onDone: () => void }) {
  const { toast } = useToast();
  const start = useStartMinimumDay();
  const [editing, setEditing] = useState(!state.configured);
  const [reason, setReason] = useState("");

  if (editing) {
    return (
      <>
        <p className={styles.explain}>
          First, your minimum day list: the smallest version of your day that still counts. You set it once.
        </p>
        <ChecklistEditor initial={state.checklist.items.map((i) => i.title)} onSaved={() => setEditing(false)} saveLabel="Save and continue" />
      </>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.explain}>
        For busy, tired or travelling days: swap your full morning routine for this short list. It's not a free pass — the
        rest of your day still counts toward your score. Finish the whole list and your streak holds (up to{" "}
        {PROTECTED_PER_WEEK} days a week).
      </p>
      <ul className={styles.preview}>
        {state.checklist.items.map((i) => (
          <li key={i.id}>{i.title}</li>
        ))}
      </ul>
      <button type="button" className={styles.textButton} onClick={() => setEditing(true)}>
        Edit list
      </button>
      <fieldset className={styles.reasons}>
        <legend>What's going on? (optional)</legend>
        <div className={styles.chips}>
          {MINIMUM_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              className={cn(styles.chip, reason === r && styles.chipOn)}
              onClick={() => setReason(reason === r ? "" : r)}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <Button
        size="lg"
        block
        loading={start.isPending}
        onClick={() =>
          start.mutate(reason, {
            onSuccess: () => {
              toast("Minimum day on — keep it small 🌱");
              onDone();
            },
            onError: (error) => toast(toApiError(error).message, "error"),
          })
        }
      >
        Start minimum day
      </Button>
    </div>
  );
}

function ChecklistEditor({ initial, onSaved, saveLabel = "Save list" }: { initial: string[]; onSaved: () => void; saveLabel?: string }) {
  const { toast } = useToast();
  const save = useSetMinimumChecklist();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const full = items.length >= MAX_STEPS;
  const has = (t: string) => items.some((i) => i.toLowerCase() === t.toLowerCase());
  const add = (title: string) => {
    const t = title.trim();
    if (t && !has(t) && !full) setItems((list) => [...list, t]);
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    add(draft);
    setDraft("");
  }

  return (
    <div className={styles.panel}>
      {items.length > 0 ? (
        <ul className={styles.editList}>
          {items.map((title) => (
            <li key={title}>
              <span>{title}</span>
              <button type="button" className={styles.remove} aria-label={`Remove ${title}`} onClick={() => setItems((l) => l.filter((x) => x !== title))}>
                <X size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.explain}>Add 3–5 tiny steps.</p>
      )}

      <div className={styles.chips}>
        {MINIMUM_SUGGESTIONS.filter((s) => !has(s)).map((s) => (
          <button key={s} type="button" className={styles.chip} disabled={full} onClick={() => add(s)}>
            + {s}
          </button>
        ))}
      </div>

      <form className={styles.addRow} onSubmit={submit}>
        <TextField label="Add your own" placeholder="e.g. Stretch 2 minutes" value={draft} disabled={full} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="secondary" icon={<Plus size={18} aria-hidden />} disabled={!draft.trim() || full}>
          Add
        </Button>
      </form>

      <Button
        size="lg"
        block
        disabled={items.length === 0}
        loading={save.isPending}
        onClick={() =>
          save.mutate(items, {
            onSuccess: () => {
              toast("Minimum day list saved ✓");
              onSaved();
            },
            onError: (error) => toast(toApiError(error).message, "error"),
          })
        }
      >
        {saveLabel}
      </Button>
    </div>
  );
}
