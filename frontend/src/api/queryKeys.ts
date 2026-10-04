import type { TaskView } from "../modules/tasks/types";

/** Every React Query key lives here, so invalidation is consistent. */
export const queryKeys = {
  dashboard: ["dashboard", "today"] as const,
  scheduleAll: ["schedule"] as const,
  schedule: (start: string, end: string) => ["schedule", start, end] as const,
  templates: ["schedule-templates"] as const,
  tasksAll: ["tasks"] as const,
  tasks: (view: TaskView) => ["tasks", view] as const,
};
