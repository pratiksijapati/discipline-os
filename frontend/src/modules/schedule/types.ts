import type { Priority } from "../../types/common";

export type ScheduleCategory =
  | "morning"
  | "workout"
  | "work"
  | "study"
  | "personal"
  | "meal"
  | "rest"
  | "growth"
  | "night";

export type ScheduleStatus = "upcoming" | "in_progress" | "completed" | "skipped";

/** What the UI shows. "missed" is calculated by the server, never stored. */
export type DisplayStatus = ScheduleStatus | "missed";

export type TemplateRepeat = "daily" | "weekdays" | "weekends" | "selected_days" | "weekly";

/** "never" exists only in the form: it means "create a one-off item". */
export type RepeatChoice = "never" | TemplateRepeat;

interface ScheduleFields {
  title: string;
  description: string;
  category: ScheduleCategory;
  priority: Priority;
  start_time: string;
  end_time: string | null;
  reminder_minutes: number | null;
  notes: string;
}

export interface ScheduleItem extends ScheduleFields {
  id: number;
  template_id: number | null;
  is_recurring: boolean;
  date: string;
  occurrence_date: string;
  status: ScheduleStatus;
  display_status: DisplayStatus;
  completed_at: string | null;
  is_customized: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplate extends ScheduleFields {
  id: number;
  repeat: TemplateRepeat;
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ScheduleItemInput = Partial<ScheduleFields & Pick<ScheduleItem, "date" | "status">>;

export type ScheduleTemplateInput = Partial<
  ScheduleFields & Pick<ScheduleTemplate, "repeat" | "days_of_week" | "start_date" | "end_date" | "is_active">
>;
