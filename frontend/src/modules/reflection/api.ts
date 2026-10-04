import { api } from "../../api/client";
import type { Paginated } from "../../types/api";
import type { DailyReflection, ReflectionInput, ReviewState } from "./types";

export const reflectionApi = {
  current: () => api.get<ReviewState>("/reflections/current/").then((r) => r.data),
  save: (input: ReflectionInput) => api.patch<ReviewState>("/reflections/current/", input).then((r) => r.data),
  complete: (input: ReflectionInput) =>
    api.post<ReviewState>("/reflections/current/complete/", input).then((r) => r.data),
  history: (page: number) =>
    api.get<Paginated<DailyReflection>>("/reflections/", { params: { page } }).then((r) => r.data),
};
