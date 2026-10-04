import { Flag } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { CheckButton } from "../../../components/ui/CheckButton";
import { cn } from "../../../utils/cn";
import { isImportant } from "../../../utils/priority";
import { formatDay, formatTime } from "../../../utils/time";
import type { Task } from "../types";
import styles from "./TaskRow.module.css";

interface TaskRowProps {
  task: Task;
  today: string;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
}

function dueLabel(task: Task, today: string): string | null {
  if (!task.due_date) return null;
  const day = task.due_date === today ? "Today" : formatDay(task.due_date, { month: "short", day: "numeric" });
  return task.due_time ? `${day}, ${formatTime(task.due_time)}` : day;
}

export function TaskRow({ task, today, onToggle, onOpen }: TaskRowProps) {
  const done = task.status === "completed";
  const due = dueLabel(task, today);

  return (
    <li className={cn(styles.row, done && styles.done)}>
      <CheckButton
        checked={done}
        onToggle={() => onToggle(task)}
        label={done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
      />
      <button type="button" className={styles.main} onClick={() => onOpen(task)}>
        <span className={styles.title}>{task.title}</span>
        {(due || isImportant(task.priority)) && (
          <span className={styles.meta}>
            {isImportant(task.priority) && (
              <span className={cn(styles.priority, styles[task.priority])}>
                <Flag size={12} aria-hidden /> {task.priority === "critical" ? "Critical" : "High"}
              </span>
            )}
            {due && <span>{due}</span>}
          </span>
        )}
      </button>
      {task.is_overdue && <Badge tone="warning">Overdue</Badge>}
    </li>
  );
}
