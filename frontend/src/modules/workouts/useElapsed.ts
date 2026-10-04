import { useEffect, useRef, useState } from "react";
import type { WorkoutSession } from "./types";

/**
 * Live workout clock. The server reports active seconds at response time;
 * while the workout runs we add the time since that response.
 */
export function useElapsed(session: WorkoutSession, receivedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  const running = session.status === "in_progress";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!running) return session.active_seconds;
  return session.active_seconds + Math.max(0, Math.floor((now - receivedAt) / 1000));
}

/**
 * Seconds left until `until` (ms timestamp), or null when not running.
 * `onDone` fires once, from the timer itself, when it reaches zero.
 */
export function useCountdown(until: number | null, onDone?: () => void): number | null {
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (until === null) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        window.clearInterval(timer);
        doneRef.current?.();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [until]);

  if (until === null) return null;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function buzz(pattern: number | number[] = [200, 100, 200]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // vibration not supported
  }
}
