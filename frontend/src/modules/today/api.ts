import { api } from "../../api/client";
import type { TodayDashboard } from "./types";

export const todayApi = {
  get: () => api.get<TodayDashboard>("/dashboard/today/").then((r) => r.data),
};
