export type HabitType = "boolean" | "quantity" | "duration";
export type HabitFrequency = "daily" | "selected_days" | "weekly_target";
export type HabitCategory = "health" | "fitness" | "mind" | "learning" | "productivity" | "sleep" | "social" | "other";

export interface Habit {
  id: number;
  name: string;
  description: string;
  category: HabitCategory;
  habit_type: HabitType;
  target_value: number;
  unit: string;
  frequency: HabitFrequency;
  days_of_week: number[];
  weekly_target: number | null;
  points: number;
  start_date: string;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface HabitDay {
  date: string;
  scheduled: boolean;
  done: boolean;
}

/** A habit plus today's progress, as returned by /habits/today/ and the dashboard. */
export interface HabitCard extends Habit {
  value: number;
  completed: boolean;
  due_today: boolean;
  streak: number | null;
  week: HabitDay[];
  week_count: number;
}

export type HabitInput = Partial<
  Pick<
    Habit,
    | "name"
    | "description"
    | "category"
    | "habit_type"
    | "target_value"
    | "unit"
    | "frequency"
    | "days_of_week"
    | "weekly_target"
    | "points"
    | "is_active"
  >
>;
