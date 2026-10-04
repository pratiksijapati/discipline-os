import {
  BedSingle,
  BookOpen,
  Briefcase,
  Dumbbell,
  Moon,
  Sprout,
  Sunrise,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTone } from "../../components/ui/Badge";
import type { WeekStart } from "../../types/auth";
import type { DisplayStatus, RepeatChoice, ScheduleCategory } from "./types";

export const CATEGORY_META: Record<ScheduleCategory, { label: string; icon: LucideIcon }> = {
  morning: { label: "Morning", icon: Sunrise },
  workout: { label: "Workout", icon: Dumbbell },
  work: { label: "Work", icon: Briefcase },
  study: { label: "Study", icon: BookOpen },
  personal: { label: "Personal", icon: User },
  meal: { label: "Meal", icon: UtensilsCrossed },
  rest: { label: "Rest", icon: BedSingle },
  growth: { label: "Growth", icon: Sprout },
  night: { label: "Night", icon: Moon },
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_META) as ScheduleCategory[]).map((value) => ({
  value,
  label: CATEGORY_META[value].label,
}));

export const STATUS_META: Record<DisplayStatus, { label: string; tone: BadgeTone }> = {
  upcoming: { label: "Upcoming", tone: "neutral" },
  in_progress: { label: "In progress", tone: "accent" },
  completed: { label: "Done", tone: "success" },
  skipped: { label: "Skipped", tone: "neutral" },
  missed: { label: "Missed", tone: "danger" },
};

export const REPEAT_OPTIONS: Array<{ value: RepeatChoice; label: string }> = [
  { value: "never", label: "Doesn't repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekends", label: "Weekends (Sat–Sun)" },
  { value: "selected_days", label: "Selected days" },
  { value: "weekly", label: "Weekly (same weekday)" },
];

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekday chips in the user's week order. Values are Python weekdays (Mon=0). */
export function orderedWeekdays(weekStart: WeekStart): Array<{ value: number; label: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const value = (weekStart + i) % 7;
    return { value, label: DAY_SHORT[value] };
  });
}

export function describeRepeat(repeat: string, days: number[], weekStart: WeekStart): string {
  if (repeat === "selected_days") {
    return orderedWeekdays(weekStart)
      .filter((day) => days.includes(day.value))
      .map((day) => day.label)
      .join(", ");
  }
  return REPEAT_OPTIONS.find((option) => option.value === repeat)?.label ?? repeat;
}
