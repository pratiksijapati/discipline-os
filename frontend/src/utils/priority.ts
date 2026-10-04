import type { Priority } from "../types/common";

export const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function isImportant(priority: Priority): boolean {
  return priority === "high" || priority === "critical";
}
