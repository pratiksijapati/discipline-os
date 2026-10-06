import { useState } from "react";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { Fab } from "../components/ui/Fab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { HabitCard } from "../modules/habits/components/HabitCard";
import cardStyles from "../modules/habits/components/HabitCard.module.css";
import { HabitForm } from "../modules/habits/components/HabitForm";
import { HabitManageList } from "../modules/habits/components/HabitManageList";
import { StarterHabits } from "../modules/habits/components/StarterHabits";
import { useHabitsToday } from "../modules/habits/hooks";
import type { Habit } from "../modules/habits/types";
import styles from "./pages.module.css";

type View = "today" | "all";

const VIEW_OPTIONS: Array<{ value: View; label: string }> = [
  { value: "today", label: "Today" },
  { value: "all", label: "All habits" },
];

export function HabitsPage() {
  useDocumentTitle("Habits");
  const user = useCurrentUser();
  const weekStart = user.settings.week_start;
  const [view, setView] = useState<View>("today");
  const [sheet, setSheet] = useState<{ habit?: Habit } | null>(null);
  const { data, isLoading, error, refetch } = useHabitsToday();

  function renderToday() {
    if (isLoading) return <PageLoader />;
    if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;
    const names = data.habits.map((h) => h.name);
    if (data.habits.length === 0) return <StarterHabits existingNames={names} onCustom={() => setSheet({})} />;

    // Due today first, then the rest (not scheduled today / weekly target already met).
    const sorted = [...data.habits].sort((a, b) => Number(b.due_today || b.completed) - Number(a.due_today || a.completed));
    const done = data.habits.filter((h) => h.completed).length;
    const due = data.habits.filter((h) => h.due_today || h.completed).length;

    return (
      <>
        <p className={styles.summaryLine}>
          {done} of {due} done today
        </p>
        <ul className={cardStyles.list}>
          {sorted.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={data.date} onOpen={(h) => setSheet({ habit: h })} />
          ))}
        </ul>
        {data.habits.length < 5 && <StarterHabits existingNames={names} onCustom={() => setSheet({})} compact />}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Habits" subtitle="Things you repeat and track." />
      <div className={styles.tabs}>
        <SegmentedControl legend="Habits view" value={view} options={VIEW_OPTIONS} onChange={setView} />
      </div>

      {view === "today" ? renderToday() : <HabitManageList weekStart={weekStart} onEdit={(habit) => setSheet({ habit })} />}

      <Fab label="Add habit" onClick={() => setSheet({})} />
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet?.habit ? "Edit habit" : "New habit"}>
        <HabitForm habit={sheet?.habit} weekStart={weekStart} onDone={() => setSheet(null)} />
      </Sheet>
    </>
  );
}
