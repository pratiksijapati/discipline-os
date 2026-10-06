import type { ScoreRating, Streaks } from "../discipline/types";

export type ProgressRange = "7d" | "30d" | "90d" | "365d";

interface ComponentStats {
  tracked_days: number;
  success_days: number;
  /** Average completion % over days it applied; null if never tracked. */
  rate: number | null;
}

export interface ProgressData {
  range: ProgressRange;
  start: string;
  end: string;
  score: {
    average: number | null;
    days_scored: number;
    days_at_threshold: number;
    threshold: number;
    target: number;
    best: { date: string; score: number } | null;
    series: Array<{ date: string; score: number | null; is_final: boolean }>;
  };
  tasks: { completed: number; total: number; rate: number | null };
  wake_up: ComponentStats;
  habits: ComponentStats;
  morning_routine: ComponentStats;
  reflection: { completed_days: number; days: number };
  workouts: {
    count: number;
    minutes: number;
    weekly_target: number;
    per_week: Array<{ week_start: string; count: number }>;
  };
  growth: { learning_hours: number; entries: number; goals_completed: number };
  streaks: Streaks;
}

export interface WeeklyReview {
  week_start: string;
  week_end: string;
  is_current: boolean;
  days_scored: number;
  /** Days switched to a Minimum Day this week (missing on older servers). */
  minimum_days?: number;
  score: {
    average: number | null;
    rating: ScoreRating | null;
    days: Array<{ date: string; score: number | null; is_final: boolean }>;
  };
  best_day: { date: string; score: number } | null;
  wake_up: { success_days: number; tracked_days: number };
  workouts: { count: number; target: number };
  tasks: { completed: number; total: number; rate: number | null };
  habits: { rate: number | null };
  learning_hours: number;
  needs_attention: { key: string; label: string; rate: number } | null;
  went_well: string[];
  struggled: string[];
  focus_next_week: string;
  /** The "This week" card. Missing on older servers. */
  insight?: WeeklyInsight;
  your_notes: string[];
}

export interface InsightArea {
  key: string;
  label: string;
  rate: number;
  /** The real numbers in words, e.g. "4 / 4 workouts" or "58% completed". */
  detail: string;
}

export interface WeeklyInsight {
  strongest: InsightArea | null;
  needs_attention: InsightArea | null;
  focus: string | null;
}

