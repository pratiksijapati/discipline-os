import type { BadgeTone } from "../../components/ui/Badge";
import type { ScoreComponentKey, ScoreRating, Streaks } from "./types";

export const RATING_TONE: Record<ScoreRating, BadgeTone> = {
  Excellent: "success",
  Strong: "success",
  Good: "accent",
  "Needs improvement": "warning",
  "Reset tomorrow": "neutral",
};

export const COMPONENT_ORDER: ScoreComponentKey[] = [
  "wake_up",
  "morning_routine",
  "workout",
  "important_tasks",
  "habits",
  "growth",
  "reflection",
];

export const COMPONENT_LABELS: Record<ScoreComponentKey, string> = {
  wake_up: "Wake up on time",
  morning_routine: "Morning routine",
  workout: "Workout",
  important_tasks: "Important tasks",
  habits: "Habits",
  growth: "Personal growth",
  reflection: "Night review",
};

export const STREAK_LABELS: Record<keyof Streaks, string> = {
  discipline: "Discipline",
  wake_up: "Wake-up",
  habits: "All habits",
  workout: "Workout target",
};
