import { formatSeconds } from "../../utils/duration";
import type { ExerciseCategory, Measure } from "./types";

export const EXERCISE_CATEGORY_OPTIONS: Array<{ value: ExerciseCategory; label: string }> = [
  { value: "strength", label: "Strength" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
  { value: "mobility", label: "Mobility" },
  { value: "other", label: "Other" },
];

export const MEASURE_OPTIONS: Array<{ value: Measure; label: string }> = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
];

export const DEFAULT_REST_SECONDS = 60;

interface TargetLike {
  measure: Measure;
  target_sets: number;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_weight_kg: number | null;
}

/** "3 × 10 @ 20 kg" or "3 × 60 sec" */
export function describeTarget(t: TargetLike): string {
  if (t.measure === "time") return `${t.target_sets} × ${formatSeconds(t.target_duration_seconds) || "—"}`;
  const reps = t.target_reps ?? "—";
  return t.target_weight_kg ? `${t.target_sets} × ${reps} @ ${t.target_weight_kg} kg` : `${t.target_sets} × ${reps}`;
}

export function describeSet(set: { reps: number | null; weight_kg: number | null; duration_seconds: number | null }) {
  if (set.duration_seconds) return formatSeconds(set.duration_seconds);
  return set.weight_kg ? `${set.weight_kg} kg × ${set.reps ?? 0}` : `${set.reps ?? 0} reps`;
}
