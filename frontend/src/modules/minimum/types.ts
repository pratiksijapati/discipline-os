import type { RoutineToday } from "../routine/types";

/** Is today a Minimum Day, why, and the short checklist with today's ticks. */
export interface MinimumDayState {
  date: string;
  active: boolean;
  reason: string;
  /** True once the checklist has at least one step. */
  configured: boolean;
  checklist: RoutineToday;
}
