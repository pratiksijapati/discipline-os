import { describeDays } from "../../utils/weekdays";
import type { WeekStart } from "../../types/auth";
import type { Habit, HabitCategory, HabitFrequency, HabitInput, HabitType } from "./types";

export const HABIT_TYPE_OPTIONS: Array<{ value: HabitType; label: string }> = [
  { value: "boolean", label: "Yes / No" },
  { value: "quantity", label: "Count" },
  { value: "duration", label: "Time" },
];

export const FREQUENCY_OPTIONS: Array<{ value: HabitFrequency; label: string }> = [
  { value: "daily", label: "Every day" },
  { value: "selected_days", label: "Selected days" },
  { value: "weekly_target", label: "Times per week" },
];

export const HABIT_CATEGORY_OPTIONS: Array<{ value: HabitCategory; label: string }> = [
  { value: "health", label: "Health" },
  { value: "fitness", label: "Fitness" },
  { value: "mind", label: "Mind" },
  { value: "learning", label: "Learning" },
  { value: "productivity", label: "Productivity" },
  { value: "sleep", label: "Sleep" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

/** One tap on a starter creates the habit — no form needed. */
export const STARTER_HABITS: Array<HabitInput & { name: string }> = [
  { name: "Drink water", habit_type: "quantity", target_value: 8, unit: "glasses", category: "health" },
  { name: "Workout", habit_type: "boolean", category: "fitness" },
  { name: "Read", habit_type: "duration", target_value: 20, unit: "min", category: "learning" },
  { name: "Study", habit_type: "duration", target_value: 60, unit: "min", category: "learning" },
  { name: "No unnecessary social media", habit_type: "boolean", category: "mind" },
  { name: "Sleep before 11:00", habit_type: "boolean", category: "sleep" },
  { name: "Journal", habit_type: "boolean", category: "mind" },
];

export function stepFor(habit: Pick<Habit, "habit_type">): number {
  return habit.habit_type === "duration" ? 5 : 1;
}

export function describeTarget(habit: Pick<Habit, "habit_type" | "target_value" | "unit">): string {
  return habit.habit_type === "boolean" ? "Once" : `${habit.target_value} ${habit.unit}`;
}

export function describeFrequency(habit: Pick<Habit, "frequency" | "days_of_week" | "weekly_target">, weekStart: WeekStart) {
  if (habit.frequency === "selected_days") return describeDays(habit.days_of_week, weekStart);
  if (habit.frequency === "weekly_target") return `${habit.weekly_target ?? 1}× per week`;
  return "Every day";
}
