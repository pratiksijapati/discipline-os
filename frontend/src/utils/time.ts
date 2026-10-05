/*
 * Calendar dates travel as "YYYY-MM-DD" strings and times as "HH:MM[:SS]".
 * They are wall-clock values in the user's timezone, so we never turn them
 * into local Date objects (which would shift them by the device's offset).
 */

import type { WeekStart } from "../types/auth";

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

function utcDate(iso: string): Date {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today's date in the given timezone, as YYYY-MM-DD. */
export function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(),
    );
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function addDays(iso: string, days: number): string {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Python-style weekday: Monday = 0 … Sunday = 6. */
export function weekdayOf(iso: string): number {
  return (utcDate(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string, weekStart: WeekStart): string {
  const back = (weekdayOf(iso) - weekStart + 7) % 7;
  return addDays(iso, -back);
}

/** "Monday, Oct 5" */
export function formatDay(iso: string, options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(utcDate(iso));
}

/** "06:15:00" → "6:15 AM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "6:00 – 6:05 AM", or "11:30 AM – 1:00 PM" when the period changes. */
export function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start);
  const from = formatTime(start);
  const to = formatTime(end);
  const samePeriod = from.slice(-2) === to.slice(-2);
  return samePeriod ? `${from.slice(0, -3)} – ${to}` : `${from} – ${to}`;
}

/** "06:15:00" → "06:15" for <input type="time"> */
export function toInputTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

/** "06:15[:00]" → 375 */
export function minutesOf(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** 375 → "06:15" */
export function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The current wall-clock time in the given timezone, as "HH:MM". */
export function nowTimeIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  } catch {
    return new Date().toTimeString().slice(0, 5);
  }
}

/**
 * Minutes from `nowIso` (an ISO timestamp already in the user's offset, as sent by
 * the dashboard API) until the wall-clock `time` on the same day.
 */
export function minutesUntil(nowIso: string, time: string): number {
  return minutesOf(time) - minutesOf(nowIso.slice(11, 16));
}

export function formatRelativeMinutes(minutes: number): string {
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `in ${hours} h ${rest} min` : `in ${hours} h`;
}
