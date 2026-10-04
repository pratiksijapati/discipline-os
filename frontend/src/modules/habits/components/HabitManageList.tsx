import { ChevronRight } from "lucide-react";
import { LoadError } from "../../../components/LoadError";
import { PageLoader } from "../../../components/StatusScreen";
import type { WeekStart } from "../../../types/auth";
import { describeFrequency, describeTarget } from "../constants";
import { useHabitList } from "../hooks";
import type { Habit } from "../types";
import styles from "./HabitForm.module.css";

function Rows({ habits, weekStart, onEdit }: { habits: Habit[]; weekStart: WeekStart; onEdit: (h: Habit) => void }) {
  return (
    <ul className={styles.manage}>
      {habits.map((habit) => (
        <li key={habit.id} className={styles.manageRow}>
          <button type="button" className={styles.manageButton} onClick={() => onEdit(habit)}>
            <span className={styles.manageText}>
              <span className={styles.manageName}>{habit.name}</span>
              <span className={styles.manageMeta}>
                {describeTarget(habit)} · {describeFrequency(habit, weekStart)}
              </span>
            </span>
            <ChevronRight size={18} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Every habit, including archived ones, for editing. */
export function HabitManageList({ weekStart, onEdit }: { weekStart: WeekStart; onEdit: (h: Habit) => void }) {
  const { data, isLoading, error, refetch } = useHabitList();

  if (isLoading) return <PageLoader />;
  if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

  const active = data.filter((h) => h.is_active);
  const archived = data.filter((h) => !h.is_active);

  return (
    <>
      {active.length > 0 ? (
        <Rows habits={active} weekStart={weekStart} onEdit={onEdit} />
      ) : (
        <p className={styles.manageMeta}>No active habits.</p>
      )}
      {archived.length > 0 && (
        <>
          <h2 className={styles.sectionLabel}>Archived</h2>
          <Rows habits={archived} weekStart={weekStart} onEdit={onEdit} />
        </>
      )}
    </>
  );
}
