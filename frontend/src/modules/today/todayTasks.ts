import type { Task } from "../tasks/types";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

/** Tasks still open that are due today or overdue. */
export function openTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter(
    (t) => (t.status === "pending" || t.status === "in_progress") && t.due_date !== null && t.due_date <= today,
  );
}

export function isImportant(task: Task): boolean {
  return task.priority === "high" || task.priority === "critical";
}

/** The single task most worth doing next: most important first, then oldest due date. */
export function topTask(tasks: Task[], today: string): Task | null {
  const open = openTasks(tasks, today);
  open.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due_date ?? "").localeCompare(b.due_date ?? ""),
  );
  return open[0] ?? null;
}
