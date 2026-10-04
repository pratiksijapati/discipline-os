import { api } from "../../api/client";
import type { ScheduleItem, ScheduleItemInput, ScheduleTemplate, ScheduleTemplateInput } from "./types";

export const scheduleApi = {
  list: (start: string, end: string) =>
    api.get<ScheduleItem[]>("/schedule/", { params: { start, end } }).then((r) => r.data),
  create: (input: ScheduleItemInput) => api.post<ScheduleItem>("/schedule/", input).then((r) => r.data),
  update: (id: number, input: ScheduleItemInput) => api.patch<ScheduleItem>(`/schedule/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/schedule/${id}/`),
};

export const templateApi = {
  list: () => api.get<ScheduleTemplate[]>("/schedule-templates/").then((r) => r.data),
  create: (input: ScheduleTemplateInput) =>
    api.post<ScheduleTemplate>("/schedule-templates/", input).then((r) => r.data),
  update: (id: number, input: ScheduleTemplateInput) =>
    api.patch<ScheduleTemplate>(`/schedule-templates/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/schedule-templates/${id}/`),
};
