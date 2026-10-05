export type ScoreComponentKey =
  | "wake_up"
  | "morning_routine"
  | "workout"
  | "important_tasks"
  | "habits"
  | "growth"
  | "reflection";

export interface ScoreComponent {
  key: ScoreComponentKey;
  label: string;
  weight: number;
  /** False when it isn't set up for the day — then it doesn't count either way. */
  applicable: boolean;
  ratio: number;
  points: number;
  /** The most this part can still reach today (0–1). Missing on scores saved before it existed. */
  max_ratio?: number;
  detail: string;
}

export type ScoreRating = "Excellent" | "Strong" | "Good" | "Needs improvement" | "Reset tomorrow";

export interface DayScore {
  date: string;
  /** Null when nothing was tracked that day. */
  score: number | null;
  rating: ScoreRating | null;
  target: number;
  is_final: boolean;
  /** Highest score still reachable today; equals `score` once the day is final. */
  max_possible?: number | null;
  breakdown: ScoreComponent[];
}

export interface Streak {
  current: number;
  best: number;
  unit: "days" | "weeks";
  threshold?: number;
}

export interface Streaks {
  discipline: Streak;
  wake_up: Streak;
  habits: Streak;
  workout: Streak;
}
