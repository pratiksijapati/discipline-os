export interface PushConfig {
  configured: boolean;
  public_key: string | null;
  devices: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  schedule_reminders: boolean;
  workout_reminder: boolean;
  workout_lead_minutes: number;
  wake_up: boolean;
  tasks: boolean;
  tasks_time: string;
  habits: boolean;
  habits_time: string;
  night_review: boolean;
  night_review_time: string;
  goal_deadlines: boolean;
  goal_deadlines_time: string;
}
