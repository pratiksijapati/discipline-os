import type { WeekStart } from "../types/auth";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekdays in the user's week order. Values are Python weekdays (Monday = 0). */
export function orderedWeekdays(weekStart: WeekStart): Array<{ value: number; label: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const value = (weekStart + i) % 7;
    return { value, label: DAY_NAMES[value] };
  });
}

/** "Sun, Mon, Tue" in week order. */
export function describeDays(days: number[], weekStart: WeekStart): string {
  return orderedWeekdays(weekStart)
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}
