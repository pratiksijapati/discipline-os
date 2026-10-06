import { CalendarClock, ListChecks, SquareCheckBig, Target, type LucideIcon } from "lucide-react";

export type AddKind = "schedule" | "task" | "habit" | "goal";

/**
 * One plain definition per kind of thing you can add, used by Quick Add and as the
 * small hint on each "new" form — so the words are always the same everywhere.
 */
export const KINDS: Record<AddKind, { title: string; meaning: string; example: string; icon: LucideIcon }> = {
  schedule: {
    title: "Schedule",
    meaning: "Something happening at a specific time.",
    example: "Workout at 6:30 AM",
    icon: CalendarClock,
  },
  task: {
    title: "Task",
    meaning: "Something to get done — no fixed time.",
    example: "Submit report",
    icon: SquareCheckBig,
  },
  habit: {
    title: "Habit",
    meaning: "Something you repeat and track.",
    example: "Read 20 minutes",
    icon: ListChecks,
  },
  goal: {
    title: "Goal",
    meaning: "A bigger result you work toward over time.",
    example: "Read 10 books",
    icon: Target,
  },
};

export const ADD_ORDER: AddKind[] = ["schedule", "task", "habit", "goal"];

/** "Something to get done — no fixed time. e.g. Submit report" */
export function kindHint(kind: AddKind): string {
  return `${KINDS[kind].meaning} e.g. ${KINDS[kind].example}`;
}
