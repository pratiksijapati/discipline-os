import { Sprout } from "lucide-react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { STARTER_HABITS } from "../constants";
import { useCreateHabit } from "../hooks";
import styles from "./HabitForm.module.css";

interface StarterHabitsProps {
  /** Names already in use — those suggestions are hidden. */
  existingNames: string[];
  onCustom: () => void;
  /** Compact chip row shown under a short habit list, instead of the full empty state. */
  compact?: boolean;
}

/** One tap per suggestion creates the habit — no form needed. */
export function StarterHabits({ existingNames, onCustom, compact = false }: StarterHabitsProps) {
  const create = useCreateHabit();
  const { toast } = useToast();
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  const available = STARTER_HABITS.filter((s) => !taken.has(s.name.toLowerCase()));

  async function add(name: string) {
    const starter = STARTER_HABITS.find((s) => s.name === name);
    if (!starter) return;
    try {
      await create.mutateAsync(starter);
      toast(`${starter.name} added ✓`);
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  const chips = (
    <div className={styles.starters}>
      {available.map((starter) => (
        <button
          key={starter.name}
          type="button"
          className={styles.starter}
          onClick={() => void add(starter.name)}
          disabled={create.isPending}
        >
          + {starter.name}
        </button>
      ))}
    </div>
  );

  if (compact) {
    if (available.length === 0) return null;
    return (
      <section className={styles.suggestions} aria-labelledby="habit-suggestions">
        <h2 id="habit-suggestions" className={styles.sectionLabel}>
          Quick add
        </h2>
        {chips}
      </section>
    );
  }

  return (
    <EmptyState
      icon={Sprout}
      title="Build your first habits"
      description="Tap a suggestion to add it, or create your own."
      action={
        <>
          {chips}
          <Button variant="secondary" onClick={onCustom} style={{ marginTop: 16 }}>
            Create my own
          </Button>
        </>
      }
    />
  );
}
