import type { Task } from "../types";
import { TaskRow } from "./TaskRow";
import styles from "./TaskRow.module.css";

interface TaskListProps {
  tasks: Task[];
  today: string;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  label: string;
}

export function TaskList({ tasks, today, onToggle, onOpen, label }: TaskListProps) {
  return (
    <ul className={styles.list} aria-label={label}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} today={today} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </ul>
  );
}
