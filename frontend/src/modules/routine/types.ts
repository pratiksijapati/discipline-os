export interface RoutineStep {
  id: number;
  title: string;
  position: number;
  is_enabled: boolean;
  duration_minutes: number | null;
}

export interface Routine {
  id: number;
  name: string;
  is_default: boolean;
  is_active: boolean;
  items: RoutineStep[];
  created_at: string;
  updated_at: string;
}

export interface RoutineTodayStep {
  id: number;
  title: string;
  position: number;
  duration_minutes: number | null;
  done: boolean;
}

/** GET /routines/today/ — today's checklist for the default routine. */
export interface RoutineToday {
  routine: { id: number; name: string; is_default: boolean } | null;
  date: string;
  items: RoutineTodayStep[];
  completed: number;
  total: number;
}

export interface RoutineCreateInput {
  name: string;
  is_default?: boolean;
  items?: Array<{ title: string; duration_minutes?: number | null }>;
}

export type RoutineStepInput = Partial<Pick<RoutineStep, "title" | "is_enabled" | "duration_minutes">>;
