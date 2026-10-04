/*
 * All user-facing dates are shown in the USER's timezone (from their profile),
 * not the device's — so the app agrees with the server about what "today" is.
 */

const FALLBACK_TZ = "Asia/Kathmandu";

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TZ;
  }
}

export function hourIn(timeZone: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: safeZone(timeZone) }).format(
    now,
  );
  return Number(hour);
}

export function greeting(timeZone: string, now: Date = new Date()): string {
  const hour = hourIn(timeZone, now);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Sunday, October 4" */
export function formatLongDate(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: safeZone(timeZone),
  }).format(now);
}

// Browsers (via ICU) still report some zones by their old names.
const RENAMED_ZONES: Record<string, string> = {
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Europe/Kiev": "Europe/Kyiv",
};

export function normalizeTimeZone(zone: string): string {
  return RENAMED_ZONES[zone] ?? zone;
}

export function browserTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ);
  } catch {
    return FALLBACK_TZ;
  }
}

/** All IANA timezones the browser knows (modern names), always including `current`. */
export function listTimeZones(current?: string): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone").map(normalizeTimeZone));
  if (current) zones.add(current);
  return [...zones].sort();
}
