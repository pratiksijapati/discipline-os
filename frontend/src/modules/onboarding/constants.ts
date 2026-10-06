import type { GoalCategory } from "../goals/types";
import type { HabitInput } from "../habits/types";
import { STARTER_HABITS } from "../habits/constants";

/** Morning routine suggestions. The first is replaced by "Wake up" when there's no challenge. */
export const MORNING_STARTERS = ["Drink water", "Make bed", "Brush / freshen up", "Workout", "Shower", "Breakfast"];
export const MORNING_DEFAULTS = ["Drink water", "Make bed"];

const starter = (name: string) => STARTER_HABITS.find((h) => h.name === name);

/**
 * Habit suggestions for setup. "Workout" is left out on purpose: workouts are already
 * tracked by the Workout feature, so a habit would count the same thing twice.
 */
export const HABIT_STARTERS: Array<HabitInput & { name: string }> = [
  starter("Drink water")!,
  starter("Read")!,
  { name: "Sleep on time", habit_type: "boolean", category: "sleep" },
  { name: "Meditate", habit_type: "duration", target_value: 10, unit: "min", category: "mind" },
  starter("Study")!,
  { name: "No social media in the morning", habit_type: "boolean", category: "mind" },
];
export const MAX_HABITS = 5;

export const GROWTH_AREAS: GoalCategory[] = ["fitness", "study", "career", "coding", "money", "reading", "projects", "other"];

export const GRACE_OPTIONS = [5, 10, 15, 30];
export const CHALLENGE_SECONDS = [30, 60, 90, 120];
