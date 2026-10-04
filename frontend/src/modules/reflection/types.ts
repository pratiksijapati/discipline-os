import type { ScoreRating } from "../discipline/types";
import type { TodaySummary } from "../today/types";

export interface DailyReflection {
  id: number;
  date: string;
  day_rating: number | null;
  went_well: string;
  improve: string;
  grateful: string;
  energy: number | null;
  mood: number | null;
  is_completed: boolean;
  completed_at: string | null;
  stats: DayStats | Record<string, never>;
  created_at: string;
  updated_at: string;
}

export interface DayStats extends TodaySummary {
  completed: number;
  not_done: number;
  /** Present once the day is completed. */
  score?: number | null;
  rating?: ScoreRating | null;
}

export interface ReviewState {
  /** The day being reviewed (yesterday when it's just after midnight). */
  date: string;
  reflection: DailyReflection | null;
  stats: DayStats;
}

export type ReflectionInput = Partial<
  Pick<DailyReflection, "day_rating" | "went_well" | "improve" | "grateful" | "energy" | "mood">
>;
