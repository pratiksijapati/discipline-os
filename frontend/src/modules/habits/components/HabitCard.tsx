import { Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { CheckButton } from "../../../components/ui/CheckButton";
import { Stepper } from "../../../components/ui/Stepper";
import { cn } from "../../../utils/cn";
import { stepFor } from "../constants";
import { useLogHabit } from "../hooks";
import type { HabitCard as HabitCardData } from "../types";
import styles from "./HabitCard.module.css";
import { WeekStrip } from "./WeekStrip";

const SEND_DELAY_MS = 450;

interface HabitCardProps {
  habit: HabitCardData;
  today: string;
  onOpen: (habit: HabitCardData) => void;
  showWeek?: boolean;
}

export function HabitCard({ habit, today, onOpen, showWeek = true }: HabitCardProps) {
  const log = useLogHabit();
  // While tapping, show the pending value instantly; one request is sent once tapping
  // pauses, and the server's value takes over again when it's saved.
  const [pending, setPending] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const value = pending ?? habit.value;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function send(next: number) {
    log.mutate({ id: habit.id, value: next }, { onSettled: () => setPending((p) => (p === next ? null : p)) });
  }

  function change(next: number) {
    setPending(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => send(next), SEND_DELAY_MS);
  }

  const completed = value >= habit.target_value;
  const pct = Math.min(100, Math.round((value / habit.target_value) * 100));
  const isBoolean = habit.habit_type === "boolean";
  const weekly = habit.frequency === "weekly_target";

  return (
    <li className={cn(styles.card, completed && styles.completed, !habit.due_today && !completed && styles.rest)}>
      <div className={styles.top}>
        <button type="button" className={styles.main} onClick={() => onOpen(habit)}>
          <span className={styles.name}>{habit.name}</span>
          <span className={styles.meta}>
            {isBoolean ? (completed ? "Done today" : "Not done yet") : `${value} / ${habit.target_value} ${habit.unit}`}
            {habit.streak !== null && habit.streak > 0 && (
              <span className={styles.streak}>
                <Flame size={14} aria-hidden /> {habit.streak}
                <span className="visually-hidden"> day streak</span>
              </span>
            )}
            {weekly && (
              <span>
                {habit.week_count}/{habit.weekly_target} this week
              </span>
            )}
          </span>
        </button>
        {!habit.due_today && !completed && <Badge>{weekly ? "Week target met" : "Not today"}</Badge>}
        {isBoolean ? (
          <CheckButton
            checked={completed}
            onToggle={() => {
              const next = completed ? 0 : 1;
              setPending(next);
              send(next);
            }}
            label={completed ? `Mark ${habit.name} as not done` : `Mark ${habit.name} as done`}
          />
        ) : (
          <Stepper value={value} onChange={change} step={stepFor(habit)} label={`${habit.name} (${habit.unit})`} />
        )}
      </div>

      {!isBoolean && (
        <div className={styles.bar} aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
      {showWeek && <WeekStrip days={habit.week} today={today} />}
    </li>
  );
}
