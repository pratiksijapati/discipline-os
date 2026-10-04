import { api } from "../../api/client";
import type { Habit, HabitCard, HabitInput } from "./types";

export const habitsApi = {
  today: () => api.get<{ date: string; habits: HabitCard[] }>("/habits/today/").then((r) => r.data),
  list: () => api.get<Habit[]>("/habits/").then((r) => r.data),
  create: (input: HabitInput) => api.post<Habit>("/habits/", input).then((r) => r.data),
  update: (id: number, input: HabitInput) => api.patch<Habit>(`/habits/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/habits/${id}/`),
  /** Sets the day's absolute value (0 clears it). */
  log: (id: number, value: number) => api.post<HabitCard>(`/habits/${id}/log/`, { value }).then((r) => r.data),
};
