import type { Streak } from "../discipline/types";

export type ChallengeType = "dance" | "jumping_jacks" | "squats" | "math";
export type ChallengeMethod = "camera" | "manual" | "math";

export interface WakeSession {
  id: number;
  date: string;
  challenge_type: ChallengeType;
  method: ChallengeMethod;
  target_seconds: number;
  active_seconds: number;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  /** Math problems (text only — answers stay on the server). */
  problems: string[];
}

export interface WakeToday {
  date: string;
  now: string;
  wake_time: string;
  deadline: string;
  challenge: { enabled: boolean; type: ChallengeType; seconds: number };
  completed: WakeSession | null;
  streak: Streak;
}

export type CompletedSession = WakeSession & { streak: Streak };
