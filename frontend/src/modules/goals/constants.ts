import {
  BookOpen,
  Briefcase,
  Brain,
  Code,
  Dumbbell,
  GraduationCap,
  Heart,
  Rocket,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Goal, GoalCategory, GoalInput, GoalMeasure } from "./types";

export const GOAL_CATEGORY_META: Record<GoalCategory, { label: string; icon: LucideIcon }> = {
  fitness: { label: "Fitness", icon: Dumbbell },
  study: { label: "Study", icon: GraduationCap },
  career: { label: "Career", icon: Briefcase },
  money: { label: "Money", icon: Wallet },
  reading: { label: "Reading", icon: BookOpen },
  coding: { label: "Coding", icon: Code },
  projects: { label: "Personal projects", icon: Rocket },
  mindset: { label: "Mindset", icon: Brain },
  relationships: { label: "Relationships", icon: Heart },
  other: { label: "Other", icon: Target },
};

export const GOAL_CATEGORY_OPTIONS = (Object.keys(GOAL_CATEGORY_META) as GoalCategory[]).map((value) => ({
  value,
  label: GOAL_CATEGORY_META[value].label,
}));

export const MEASURE_OPTIONS: Array<{ value: GoalMeasure; label: string }> = [
  { value: "count", label: "Count (e.g. 20 workouts)" },
  { value: "duration", label: "Time in hours (e.g. 30 h)" },
  { value: "currency", label: "Money (e.g. NPR 10,000)" },
  { value: "number", label: "Number with a unit" },
  { value: "percentage", label: "Percentage" },
  { value: "boolean", label: "Done / not done" },
];

/** One-tap examples for the empty state. */
export const EXAMPLE_GOALS: Array<GoalInput & { title: string }> = [
  { title: "Learn React", category: "coding", measure: "duration", target_value: 30 },
  { title: "Workout 20 times", category: "fitness", measure: "count", target_value: 20 },
  { title: "Save NPR 10,000", category: "money", measure: "currency", target_value: 10000, unit: "NPR" },
  { title: "Read 12 books", category: "reading", measure: "count", target_value: 12, unit: "books" },
];

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** A single amount in the goal's unit: "NPR 4,500", "1.5 h", "40%", "12 books". */
export function formatAmount(goal: Pick<Goal, "measure" | "unit">, value: number): string {
  const n = formatNumber(value);
  switch (goal.measure) {
    case "currency":
      return `${goal.unit} ${n}`;
    case "duration":
      return `${n} h`;
    case "percentage":
      return `${n}%`;
    default:
      return goal.unit ? `${n} ${goal.unit}` : n;
  }
}

/** "NPR 4,500 / 10,000", "12 / 30 h", "13 / 20", "40%", "Done". */
export function formatProgress(goal: Goal): string {
  const current = formatNumber(goal.current_value);
  const target = formatNumber(goal.target_value);
  switch (goal.measure) {
    case "boolean":
      return goal.current_value >= 1 ? "Done" : "Not done yet";
    case "percentage":
      return `${current}%`;
    case "currency":
      return `${goal.unit} ${current} / ${target}`;
    case "duration":
      return `${current} / ${target} h`;
    default:
      return `${current} / ${target}${goal.unit ? ` ${goal.unit}` : ""}`;
  }
}

/** The one-tap action shown on a goal card, if the measure has an obvious step. */
export function quickStep(goal: Goal): { label: string; amount: number; mode: "add" | "set" } | null {
  switch (goal.measure) {
    case "count":
    case "number":
      return { label: "+1", amount: 1, mode: "add" };
    case "duration":
      return { label: "+1 h", amount: 1, mode: "add" };
    case "boolean":
      return { label: "Mark done", amount: 1, mode: "set" };
    default:
      return null;
  }
}

export function describeDeadline(daysLeft: number | null): { text: string; overdue: boolean } | null {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return { text: `${-daysLeft} day${daysLeft === -1 ? "" : "s"} overdue`, overdue: true };
  if (daysLeft === 0) return { text: "Due today", overdue: false };
  return { text: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, overdue: false };
}
