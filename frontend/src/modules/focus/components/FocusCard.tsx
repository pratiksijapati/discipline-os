import { Check, Crosshair, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/Field";
import { cn } from "../../../utils/cn";
import { useClearFocus, useSetFocus, useUpdateFocus } from "../hooks";
import type { DailyFocus } from "../types";
import styles from "./FocusCard.module.css";

/** Today's Focus: the one important thing. Set it, finish it, or change your mind. */
export function FocusCard({ focus }: { focus: DailyFocus | null }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <FocusForm focus={focus} onDone={() => setEditing(false)} />;
  }
  if (!focus) {
    return (
      <button type="button" className={cn(styles.card, styles.empty)} onClick={() => setEditing(true)}>
        <Crosshair size={20} aria-hidden className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.label}>Today's focus</span>
          <span className={styles.prompt}>Set the one thing that matters most today</span>
        </span>
        <span className={styles.set}>Set</span>
      </button>
    );
  }
  return focus.completed ? <DoneFocus focus={focus} /> : <OpenFocus focus={focus} onEdit={() => setEditing(true)} />;
}

function OpenFocus({ focus, onEdit }: { focus: DailyFocus; onEdit: () => void }) {
  const { toast } = useToast();
  const update = useUpdateFocus();
  return (
    <section className={styles.card} aria-labelledby="focus-label">
      <div className={styles.head}>
        <p id="focus-label" className={styles.label}>
          Today's focus
        </p>
        <button type="button" className={styles.textButton} onClick={onEdit}>
          Edit
        </button>
      </div>
      <p className={styles.title}>{focus.title}</p>
      <Button
        icon={<Check size={18} aria-hidden />}
        loading={update.isPending}
        onClick={() =>
          update.mutate(
            { id: focus.id, input: { completed: true } },
            {
              onSuccess: () => toast("Focus done — the most important thing is finished 🎯"),
              onError: (error) => toast(toApiError(error).message, "error"),
            },
          )
        }
      >
        Mark complete
      </Button>
    </section>
  );
}

function DoneFocus({ focus }: { focus: DailyFocus }) {
  const update = useUpdateFocus();
  return (
    <section className={cn(styles.card, styles.done)} aria-label="Today's focus, done">
      <Check size={20} aria-hidden className={styles.doneIcon} />
      <span className={styles.text}>
        <span className={styles.label}>Focus done</span>
        <span className={styles.doneTitle}>{focus.title}</span>
      </span>
      <button
        type="button"
        className={styles.textButton}
        disabled={update.isPending}
        onClick={() => update.mutate({ id: focus.id, input: { completed: false } })}
      >
        <RotateCcw size={14} aria-hidden /> Undo
      </button>
    </section>
  );
}

function FocusForm({ focus, onDone }: { focus: DailyFocus | null; onDone: () => void }) {
  const { toast } = useToast();
  const create = useSetFocus();
  const update = useUpdateFocus();
  const clear = useClearFocus();
  const [title, setTitle] = useState(focus?.title ?? "");
  const [error, setError] = useState<string>();

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Write what you want to get done.");
    try {
      if (focus) await update.mutateAsync({ id: focus.id, input: { title } });
      else await create.mutateAsync({ title });
      onDone();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function remove() {
    if (!focus) return;
    try {
      await clear.mutateAsync(focus.id);
      toast("Focus cleared");
      onDone();
    } catch (err) {
      toast(toApiError(err).message, "error");
    }
  }

  return (
    <form className={cn(styles.card, styles.form)} onSubmit={(e) => void save(e)}>
      <TextField
        label="Today's focus"
        hint="If you finish only one thing today, what is it?"
        value={title}
        maxLength={200}
        onChange={(e) => {
          setTitle(e.target.value);
          setError(undefined);
        }}
        error={error}
        autoFocus
        enterKeyHint="done"
      />
      <div className={styles.formActions}>
        <Button type="submit" loading={create.isPending || update.isPending}>
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {focus && (
          <button type="button" className={cn(styles.textButton, styles.clear)} onClick={() => void remove()}>
            Clear focus
          </button>
        )}
      </div>
    </form>
  );
}
