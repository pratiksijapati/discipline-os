/** "If I finish only ONE important thing today, it's this." One per day. */
export interface DailyFocus {
  id: number;
  date: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DailyFocusInput = Partial<Pick<DailyFocus, "title" | "completed" | "date">>;
