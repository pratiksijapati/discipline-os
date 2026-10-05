import type { DayScore, Streaks } from "../discipline/types";
import type { DailyFocus } from "../focus/types";
import type { Goal } from "../goals/types";
import type { HabitCard } from "../habits/types";
import type { RoutineToday } from "../routine/types";
import type { ScheduleItem } from "../schedule/types";
import type { Task } from "../tasks/types";
import type { WorkoutToday } from "../workouts/types";

interface Count {
  completed: number;
  total: number;
}

export interface TodaySummary {
  schedule: Count & { missed: number };
  tasks: Count & { overdue: number };
  habits: Count;
  routine: Count;
  workout_done: boolean;
  /** Today's focus at a glance. Missing on night reviews saved before the feature existed. */
  focus?: { title: string; completed: boolean } | null;
  /** Simple completion % until the Discipline Score arrives. */
  progress: number;
}

export interface TodayDashboard {
  date: string;
  /** ISO timestamp in the user's timezone offset. */
  now: string;
  score: DayScore;
  streaks: Streaks;
  current: ScheduleItem | null;
  next: ScheduleItem | null;
  schedule: ScheduleItem[];
  tasks: Task[];
  /** Habits due today, or already done today. */
  habits: HabitCard[];
  routine: RoutineToday;
  workout: WorkoutToday;
  main_goal: Goal | null;
  focus: DailyFocus | null;
  reflection: { completed: boolean; day_rating: number | null };
  summary: TodaySummary;
}
