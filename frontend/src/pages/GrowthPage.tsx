import { Target } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";
import { toApiError } from "../api/errors";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { useToast } from "../components/toast/useToast";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { GoalCard } from "../modules/goals/components/GoalCard";
import { GoalDetails } from "../modules/goals/components/GoalDetails";
import { GoalForm } from "../modules/goals/components/GoalForm";
import styles from "../modules/goals/components/Goals.module.css";
import { EXAMPLE_GOALS } from "../modules/goals/constants";
import { useGoals, useSaveGoal } from "../modules/goals/hooks";
import type { GoalListFilter } from "../modules/goals/types";
import pageStyles from "./pages.module.css";

const TABS: Array<{ value: GoalListFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Achieved" },
];

type SheetState = { kind: "new" } | { kind: "goal"; id: number } | null;

export function GrowthPage() {
  useDocumentTitle("Goals");
  const { toast } = useToast();
  const location = useLocation();
  const openFromToday = (location.state as { goalId?: number } | null)?.goalId;

  const [tab, setTab] = useState<GoalListFilter>("active");
  const [sheet, setSheet] = useState<SheetState>(openFromToday ? { kind: "goal", id: openFromToday } : null);

  const active = useGoals("active");
  const completed = useGoals("completed");
  const create = useSaveGoal();
  const current = tab === "active" ? active : completed;

  // Look the open goal up in fresh data, so its numbers update after logging.
  const all = [...(active.data ?? []), ...(completed.data ?? [])];
  const openGoal = sheet?.kind === "goal" ? all.find((g) => g.id === sheet.id) : undefined;

  async function addExample(index: number) {
    try {
      const goal = await create.mutateAsync({ input: EXAMPLE_GOALS[index] });
      toast(`${goal.title} added ✓`);
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  function renderList() {
    if (current.isLoading) return <PageLoader />;
    if (current.error || !current.data) return <LoadError error={current.error} onRetry={() => void current.refetch()} />;
    if (current.data.length === 0) {
      return tab === "active" ? (
        <EmptyState
          icon={Target}
          title="Set your first goal"
          description="Something you want to grow in — tap an example to start, or create your own."
          action={
            <>
              <div className={styles.examples}>
                {EXAMPLE_GOALS.map((example, index) => (
                  <button
                    key={example.title}
                    type="button"
                    className={styles.example}
                    onClick={() => void addExample(index)}
                    disabled={create.isPending}
                  >
                    + {example.title}
                  </button>
                ))}
              </div>
              <Button variant="secondary" onClick={() => setSheet({ kind: "new" })} style={{ marginTop: 16 }}>
                Create my own
              </Button>
            </>
          }
        />
      ) : (
        <EmptyState icon={Target} title="Nothing achieved yet" description="Goals you complete are celebrated here." />
      );
    }
    const titles = new Set(all.map((g) => g.title.toLowerCase()));
    const unusedExamples = EXAMPLE_GOALS.map((example, index) => ({ example, index })).filter(
      ({ example }) => !titles.has(example.title.toLowerCase()),
    );
    return (
      <>
        <ul className={styles.list}>
          {current.data.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} onOpen={(g) => setSheet({ kind: "goal", id: g.id })} />
            </li>
          ))}
        </ul>
        {tab === "active" && current.data.length < 4 && unusedExamples.length > 0 && (
          <section className={styles.suggestions} aria-labelledby="goal-ideas">
            <h2 id="goal-ideas" className={styles.suggestionsTitle}>
              Quick add
            </h2>
            <div className={styles.examples}>
              {unusedExamples.map(({ example, index }) => (
                <button
                  key={example.title}
                  type="button"
                  className={styles.example}
                  onClick={() => void addExample(index)}
                  disabled={create.isPending}
                >
                  + {example.title}
                </button>
              ))}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Goals" subtitle="What you're growing toward." />
      <div className={pageStyles.tabs}>
        <SegmentedControl legend="Goal list" value={tab} options={TABS} onChange={setTab} />
      </div>
      {renderList()}

      <Fab label="New goal" onClick={() => setSheet({ kind: "new" })} />
      <Sheet
        open={sheet !== null && (sheet.kind === "new" || Boolean(openGoal))}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "new" ? "New goal" : (openGoal?.title ?? "")}
      >
        {sheet?.kind === "new" && <GoalForm onDone={(goal) => setSheet({ kind: "goal", id: goal.id })} />}
        {openGoal && <GoalDetails goal={openGoal} onClose={() => setSheet(null)} />}
      </Sheet>
    </>
  );
}
