import type { Priority } from "../../types/common";

export type GoalCategory =
  | "fitness"
  | "study"
  | "career"
  | "money"
  | "reading"
  | "coding"
  | "projects"
  | "mindset"
  | "relationships"
  | "other";

export type GoalMeasure = "boolean" | "number" | "currency" | "duration" | "count" | "percentage";
export type GoalStatus = "not_started" | "in_progress" | "completed" | "paused";
export type GoalListFilter = "active" | "completed";

export interface Goal {
  id: number;
  title: string;
  description: string;
  category: GoalCategory;
  measure: GoalMeasure;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  deadline: string | null;
  status: GoalStatus;
  priority: Priority;
  is_main: boolean;
  progress_pct: number;
  /** Days until the deadline (negative = overdue); null without a deadline or when completed. */
  days_left: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalInput = Partial<
  Pick<
    Goal,
    | "title"
    | "description"
    | "category"
    | "measure"
    | "target_value"
    | "current_value"
    | "unit"
    | "deadline"
    | "status"
    | "priority"
  >
>;

export interface GoalProgressEntry {
  id: number;
  goal: number;
  date: string;
  delta: number;
  value_after: number;
  note: string;
  created_at: string;
}

export interface LogInput {
  amount: number;
  mode: "add" | "set";
  note?: string;
}
