import { api } from "../../api/client";
import type { Task, TaskInput, TaskView } from "./types";

export const tasksApi = {
  list: (view: TaskView) => api.get<Task[]>("/tasks/", { params: { view } }).then((r) => r.data),
  create: (input: TaskInput) => api.post<Task>("/tasks/", input).then((r) => r.data),
  update: (id: number, input: TaskInput) => api.patch<Task>(`/tasks/${id}/`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/tasks/${id}/`),
};
