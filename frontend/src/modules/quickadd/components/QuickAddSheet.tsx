import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Sheet } from "../../../components/ui/Sheet";
import type { WeekStart } from "../../../types/auth";
import { GoalForm } from "../../goals/components/GoalForm";
import { HabitForm } from "../../habits/components/HabitForm";
import { ScheduleForm } from "../../schedule/components/ScheduleForm";
import { TaskForm } from "../../tasks/components/TaskForm";
import { ADD_ORDER, KINDS, type AddKind } from "../kinds";
import styles from "./QuickAddSheet.module.css";

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  /** New schedule items and tasks default to this date. */
  date: string;
  weekStart: WeekStart;
}

/** The one "+": first "what is it?", then the right form. Explains the four kinds as it goes. */
export function QuickAddSheet({ open, onClose, date, weekStart }: QuickAddSheetProps) {
  const [kind, setKind] = useState<AddKind | null>(null);

  const close = () => {
    setKind(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={kind ? `New ${KINDS[kind].title.toLowerCase()}` : "What do you want to add?"}>
      {kind === null ? (
        <ul className={styles.options}>
          {ADD_ORDER.map((k) => {
            const { title, meaning, example, icon: Icon } = KINDS[k];
            return (
              <li key={k}>
                <button type="button" className={styles.option} onClick={() => setKind(k)}>
                  <span className={styles.icon} aria-hidden>
                    <Icon size={22} />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.title}>{title}</span>
                    <span className={styles.meaning}>{meaning}</span>
                    <span className={styles.example}>e.g. {example}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden className={styles.chevron} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <button type="button" className={styles.back} onClick={() => setKind(null)}>
            <ArrowLeft size={16} aria-hidden /> Choose something else
          </button>
          {kind === "schedule" && <ScheduleForm mode={{ kind: "create", date }} weekStart={weekStart} onSaved={close} />}
          {kind === "task" && <TaskForm defaultDueDate={date} onDone={close} />}
          {kind === "habit" && <HabitForm weekStart={weekStart} onDone={close} />}
          {kind === "goal" && <GoalForm onDone={close} />}
        </>
      )}
    </Sheet>
  );
}
