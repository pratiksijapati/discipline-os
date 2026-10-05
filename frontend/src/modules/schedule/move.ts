import { fromMinutes, minutesOf } from "../../utils/time";
import type { ScheduleItem, ScheduleItemInput } from "./types";

const DAY_END = 24 * 60 - 1; // 23:59
const STEP = 15;

export type MoveOption = "later" | "tomorrow" | "custom";

/** Next quarter hour after `now` ("14:07" → "14:15"), or null when the day is nearly over. */
export function laterTodayStart(now: string): string | null {
  const next = Math.ceil((minutesOf(now) + 1) / STEP) * STEP;
  return next <= DAY_END - STEP ? fromMinutes(next) : null;
}

/**
 * The PATCH that moves one item (one day's occurrence, never the repeating routine) to a new
 * date and start time. The length stays the same; if it would run past midnight the end is
 * dropped. A moved item is always open again ("upcoming"), whatever it was before.
 */
export function moveInput(item: ScheduleItem, date: string, start: string): ScheduleItemInput {
  const begin = minutesOf(start);
  const length = item.end_time ? minutesOf(item.end_time) - minutesOf(item.start_time) : null;
  const end = length !== null && begin + length <= DAY_END ? fromMinutes(begin + length) : null;
  return { date, start_time: start, end_time: end, status: "upcoming" };
}
