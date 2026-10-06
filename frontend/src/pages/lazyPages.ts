import { lazy, type ComponentType } from "react";
import { isStaleBuildError, reloadForNewBuild } from "../services/staleBuild";

/**
 * App pages are code-split so the login screen loads fast.
 * If a page's file is gone because a new version was deployed, reload to get the new build.
 */
function page<T extends ComponentType>(load: () => Promise<T>) {
  return lazy(() =>
    load().then(
      (component) => ({ default: component }),
      (error: unknown) => {
        if (isStaleBuildError(error) && reloadForNewBuild()) return new Promise<never>(() => {});
        throw error;
      },
    ),
  );
}

export const TodayPage = page(() => import("./TodayPage").then((m) => m.TodayPage));
export const SchedulePage = page(() => import("./SchedulePage").then((m) => m.SchedulePage));
export const TasksPage = page(() => import("./TasksPage").then((m) => m.TasksPage));
export const HabitsPage = page(() => import("./HabitsPage").then((m) => m.HabitsPage));
export const RoutinePage = page(() => import("./RoutinePage").then((m) => m.RoutinePage));
export const WorkoutPage = page(() => import("./WorkoutPage").then((m) => m.WorkoutPage));
export const WorkoutSessionPage = page(() => import("./WorkoutSessionPage").then((m) => m.WorkoutSessionPage));
export const GrowthPage = page(() => import("./GrowthPage").then((m) => m.GrowthPage));
export const ReflectionPage = page(() => import("./ReflectionPage").then((m) => m.ReflectionPage));
export const WakePage = page(() => import("./WakePage").then((m) => m.WakePage));
export const SettingsPage = page(() => import("./SettingsPage").then((m) => m.SettingsPage));
export const MorePage = page(() => import("./MorePage").then((m) => m.MorePage));
export const ProgressPage = page(() => import("./ProgressPage").then((m) => m.ProgressPage));
export const OnboardingPage = page(() => import("./OnboardingPage").then((m) => m.OnboardingPage));
export const PrepareTomorrowPage = page(() => import("./PrepareTomorrowPage").then((m) => m.PrepareTomorrowPage));
