import type { Priority } from "../../types/common";

export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";

export type TaskCategory = "work" | "study" | "personal" | "health" | "home" | "growth" | "finance" | "other";

export type TaskView = "today" | "upcoming" | "someday" | "completed";

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  category: TaskCategory;
  status: TaskStatus;
  points: number;
  notes: string;
  is_overdue: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Partial<
  Pick<Task, "title" | "description" | "due_date" | "due_time" | "priority" | "category" | "status" | "points" | "notes">
>;
