import { api } from "../../api/client";
import type { RoutineToday } from "../routine/types";
import type { MinimumDayState } from "./types";

export const minimumApi = {
  get: () => api.get<MinimumDayState>("/minimum-day/").then((r) => r.data),
  start: (reason: string) => api.post<MinimumDayState>("/minimum-day/", { reason }).then((r) => r.data),
  stop: () => api.delete<MinimumDayState>("/minimum-day/").then((r) => r.data),
  setChecklist: (items: string[]) => api.put<MinimumDayState>("/minimum-day/checklist/", { items }).then((r) => r.data),
  check: (stepId: number, done: boolean) =>
    api.post<RoutineToday>(`/routine-items/${stepId}/check/`, { done }).then((r) => r.data),
};
