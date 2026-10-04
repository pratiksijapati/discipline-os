export type ThemePreference = "light" | "dark" | "system";

/** 0 = Monday, 6 = Sunday (matches Python's weekday()). */
export type WeekStart = 0 | 6;

export interface UserSettings {
  theme: ThemePreference;
  week_start: WeekStart;
  weekly_workout_target: number;
  /** "HH:MM:SS" */
  wake_time: string;
  wake_grace_minutes: number;
  score_weights: Record<string, number>;
  streak_threshold: number;
  daily_target_score: number;
  wake_challenge_enabled: boolean;
  wake_challenge_type: "dance" | "jumping_jacks" | "squats" | "math";
  wake_challenge_seconds: number;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  timezone: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  timezone?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export type ProfileUpdate = Partial<Pick<User, "first_name" | "last_name" | "timezone">>;
export type SettingsUpdate = Partial<
  Pick<
    UserSettings,
    | "theme"
    | "week_start"
    | "weekly_workout_target"
    | "wake_time"
    | "wake_grace_minutes"
    | "score_weights"
    | "streak_threshold"
    | "daily_target_score"
    | "wake_challenge_enabled"
    | "wake_challenge_type"
    | "wake_challenge_seconds"
  >
>;
