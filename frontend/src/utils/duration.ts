/** 754 → "12:34", 3903 → "1:05:03" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(hours ? 2 : 1, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 2640 → "44 min", 3900 → "1 h 5 min" */
export function formatMinutes(totalSeconds: number | null | undefined): string {
  const minutes = Math.round((totalSeconds ?? 0) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** 60 → "60 sec", 90 → "1:30" */
export function formatSeconds(seconds: number | null | undefined): string {
  if (!seconds) return "";
  return seconds < 120 ? `${seconds} sec` : formatClock(seconds);
}
