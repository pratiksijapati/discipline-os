import { api } from "../../api/client";
import type { DailyFocus, DailyFocusInput } from "./types";

export const focusApi = {
  create: (input: DailyFocusInput) => api.post<DailyFocus>("/daily-focus/", input).then((r) => r.data),
  update: (id: number, input: DailyFocusInput) => api.patch<DailyFocus>(`/daily-focus/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/daily-focus/${id}/`),
};
