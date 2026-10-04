import { api } from "../../api/client";
import type { ProgressData, ProgressRange, WeeklyReview } from "./types";

export const progressApi = {
  get: (range: ProgressRange) => api.get<ProgressData>("/progress/", { params: { range } }).then((r) => r.data),
  weekly: (offset: number) =>
    api.get<WeeklyReview>("/progress/weekly/", { params: { offset } }).then((r) => r.data),
};
