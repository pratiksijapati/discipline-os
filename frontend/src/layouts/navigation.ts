import {
  CalendarClock,
  ChartLine,
  Dumbbell,
  ListChecks,
  ListOrdered,
  NotebookPen,
  Settings,
  SquareCheckBig,
  Sunrise,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Shown in the mobile bottom bar (plus "More") and at the top of the sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/today", label: "Today", icon: Sunrise },
  { to: "/schedule", label: "My Day", icon: CalendarClock },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/habits", label: "Habits", icon: ListChecks },
];

/** Under "More" on mobile; listed below the primary items on desktop. */
export const SECONDARY_NAV: NavItem[] = [
  { to: "/tasks", label: "Tasks", icon: SquareCheckBig },
  { to: "/routine", label: "Morning routine", icon: ListOrdered },
  { to: "/growth", label: "Goals", icon: Target },
  { to: "/progress", label: "Progress", icon: ChartLine },
  { to: "/reflection", label: "Reflection", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];
