import type { ScheduleItem } from "../schedule/types";
import type { Task } from "../tasks/types";

export interface TodaySummary {
  schedule: { completed: number; total: number; missed: number };
  tasks: { completed: number; total: number; overdue: number };
  /** Simple completion % until the Discipline Score arrives. */
  progress: number;
}

export interface TodayDashboard {
  date: string;
  /** ISO timestamp in the user's timezone offset. */
  now: string;
  current: ScheduleItem | null;
  next: ScheduleItem | null;
  schedule: ScheduleItem[];
  tasks: Task[];
  summary: TodaySummary;
}
