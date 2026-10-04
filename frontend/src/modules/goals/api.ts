import { api } from "../../api/client";
import type { Goal, GoalInput, GoalListFilter, GoalProgressEntry, LogInput } from "./types";

export const goalsApi = {
  list: (status: GoalListFilter) => api.get<Goal[]>("/goals/", { params: { status } }).then((r) => r.data),
  create: (input: GoalInput) => api.post<Goal>("/goals/", input).then((r) => r.data),
  update: (id: number, input: GoalInput) => api.patch<Goal>(`/goals/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/goals/${id}/`),
  progress: (id: number) => api.get<GoalProgressEntry[]>(`/goals/${id}/progress/`).then((r) => r.data),
  log: (id: number, input: LogInput) => api.post<Goal>(`/goals/${id}/progress/`, input).then((r) => r.data),
  undo: (entryId: number) => api.delete<Goal>(`/goal-progress/${entryId}/`).then((r) => r.data),
  toggleMain: (id: number) => api.post<Goal>(`/goals/${id}/main/`).then((r) => r.data),
};
