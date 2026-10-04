import { api } from "../../api/client";
import type { Paginated } from "../../types/api";
import type {
  Exercise,
  ExerciseHistoryEntry,
  ExerciseInput,
  SetInput,
  WorkoutHistoryRow,
  WorkoutPlan,
  WorkoutPlanInput,
  WorkoutSession,
  WorkoutStats,
} from "./types";

export const exercisesApi = {
  list: () => api.get<Exercise[]>("/exercises/").then((r) => r.data),
  create: (input: ExerciseInput) => api.post<Exercise>("/exercises/", input).then((r) => r.data),
  update: (id: number, input: ExerciseInput) => api.patch<Exercise>(`/exercises/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/exercises/${id}/`),
  history: (id: number) => api.get<ExerciseHistoryEntry[]>(`/exercises/${id}/history/`).then((r) => r.data),
};

export const plansApi = {
  list: () => api.get<WorkoutPlan[]>("/workout-plans/").then((r) => r.data),
  create: (input: WorkoutPlanInput) => api.post<WorkoutPlan>("/workout-plans/", input).then((r) => r.data),
  update: (id: number, input: WorkoutPlanInput) =>
    api.patch<WorkoutPlan>(`/workout-plans/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/workout-plans/${id}/`),
  starter: () => api.post<WorkoutPlan[]>("/workout-plans/starter/").then((r) => r.data),
};

export type SessionAction = "pause" | "resume" | "complete" | "cancel";

export const sessionsApi = {
  start: (plan: number | null) => api.post<WorkoutSession>("/workouts/", { plan }).then((r) => r.data),
  active: () => api.get<WorkoutSession | null>("/workouts/active/").then((r) => r.data),
  get: (id: number) => api.get<WorkoutSession>(`/workouts/${id}/`).then((r) => r.data),
  history: (page: number) =>
    api.get<Paginated<WorkoutHistoryRow>>("/workouts/", { params: { page } }).then((r) => r.data),
  stats: () => api.get<WorkoutStats>("/workouts/stats/").then((r) => r.data),
  action: (id: number, action: SessionAction) =>
    api.post<WorkoutSession>(`/workouts/${id}/${action}/`).then((r) => r.data),
  addSet: (id: number, input: SetInput) => api.post<WorkoutSession>(`/workouts/${id}/sets/`, input).then((r) => r.data),
  deleteSet: (setId: number) => api.delete(`/workout-sets/${setId}/`),
  addExercise: (id: number, exercise: number) =>
    api.post<WorkoutSession>(`/workouts/${id}/exercises/`, { exercise }).then((r) => r.data),
};
