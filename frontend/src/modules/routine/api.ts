import { api } from "../../api/client";
import type { Routine, RoutineCreateInput, RoutineStep, RoutineStepInput, RoutineToday } from "./types";

export const routineApi = {
  today: () => api.get<RoutineToday>("/routines/today/").then((r) => r.data),
  list: () => api.get<Routine[]>("/routines/").then((r) => r.data),
  create: (input: RoutineCreateInput) => api.post<Routine>("/routines/", input).then((r) => r.data),
  rename: (id: number, name: string) => api.patch<Routine>(`/routines/${id}/`, { name }).then((r) => r.data),
  reorder: (id: number, itemIds: number[]) =>
    api.post<Routine>(`/routines/${id}/reorder/`, { item_ids: itemIds }).then((r) => r.data),
  addStep: (routineId: number, title: string) =>
    api.post<RoutineStep>("/routine-items/", { routine: routineId, title }).then((r) => r.data),
  updateStep: (id: number, input: RoutineStepInput) =>
    api.patch<RoutineStep>(`/routine-items/${id}/`, input).then((r) => r.data),
  removeStep: (id: number) => api.delete(`/routine-items/${id}/`),
  check: (stepId: number, done: boolean) =>
    api.post<RoutineToday>(`/routine-items/${stepId}/check/`, { done }).then((r) => r.data),
};
