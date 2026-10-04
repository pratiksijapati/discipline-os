import type { TaskCategory, TaskView } from "./types";

export const TASK_CATEGORY_OPTIONS: Array<{ value: TaskCategory; label: string }> = [
  { value: "personal", label: "Personal" },
  { value: "work", label: "Work" },
  { value: "study", label: "Study" },
  { value: "health", label: "Health" },
  { value: "home", label: "Home" },
  { value: "growth", label: "Growth" },
  { value: "finance", label: "Finance" },
  { value: "other", label: "Other" },
];

export const TASK_VIEW_OPTIONS: Array<{ value: TaskView; label: string }> = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "someday", label: "Someday" },
  { value: "completed", label: "Done" },
];
