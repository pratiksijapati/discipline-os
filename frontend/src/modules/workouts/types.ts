export type Measure = "reps" | "time";
export type ExerciseCategory = "strength" | "bodyweight" | "cardio" | "core" | "mobility" | "other";
export type SessionStatus = "in_progress" | "paused" | "completed" | "cancelled";

export interface Exercise {
  id: number;
  name: string;
  category: ExerciseCategory;
  measure: Measure;
  instructions: string;
  default_sets: number;
  default_reps: number | null;
  default_duration_seconds: number | null;
  default_weight_kg: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ExerciseInput = Partial<
  Pick<
    Exercise,
    | "name"
    | "category"
    | "measure"
    | "instructions"
    | "default_sets"
    | "default_reps"
    | "default_duration_seconds"
    | "default_weight_kg"
    | "is_active"
  >
>;

interface Targets {
  position: number;
  target_sets: number;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_weight_kg: number | null;
}

export interface PlanExercise extends Targets {
  id: number;
  exercise: number;
  exercise_name: string;
  measure: Measure;
  rest_seconds: number;
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description: string;
  days_of_week: number[];
  is_active: boolean;
  exercises: PlanExercise[];
  created_at: string;
  updated_at: string;
}

export interface PlanExerciseInput {
  exercise: number;
  target_sets: number;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_weight_kg: number | null;
}

export interface WorkoutPlanInput {
  name?: string;
  description?: string;
  days_of_week?: number[];
  is_active?: boolean;
  exercises?: PlanExerciseInput[];
}

export interface WorkoutSet {
  id: number;
  session_exercise: number;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  completed_at: string;
}

export interface SessionExercise extends Targets {
  id: number;
  exercise: number;
  exercise_name: string;
  measure: Measure;
  instructions: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: number;
  plan: number | null;
  name: string;
  date: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  paused_at: string | null;
  paused_seconds: number;
  duration_seconds: number | null;
  /** Active time so far (excludes pauses), as of when the response was made. */
  active_seconds: number;
  notes: string;
  exercises: SessionExercise[];
  totals: { exercises: number; exercises_planned: number; sets: number; volume_kg: number };
}

export interface WorkoutHistoryRow {
  id: number;
  name: string;
  date: string;
  status: SessionStatus;
  started_at: string;
  duration_seconds: number | null;
  exercise_count: number;
  set_count: number;
}

export interface WorkoutStats {
  week: { count: number; target: number };
  month: { count: number; target: number };
  week_streak: number;
  best_week_streak: number;
  total_workouts: number;
  total_minutes: number;
}

export interface ExerciseHistoryEntry {
  session_id: number;
  date: string;
  sets: Array<{ reps: number | null; weight_kg: number | null; duration_seconds: number | null }>;
  best_weight_kg: number | null;
  total_reps: number;
  best_duration_seconds: number | null;
}

export interface SetInput {
  session_exercise: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_seconds?: number | null;
}

/** Workout block of the Today dashboard. */
export interface WorkoutToday {
  active: { id: number; name: string; status: SessionStatus } | null;
  completed: { id: number; name: string; duration_seconds: number | null } | null;
  planned: Array<{ id: number; name: string }>;
}
