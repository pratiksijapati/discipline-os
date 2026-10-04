import { lazy } from "react";

// App pages are code-split so the login screen loads fast.
export const TodayPage = lazy(() => import("./TodayPage").then((m) => ({ default: m.TodayPage })));
export const SettingsPage = lazy(() => import("./SettingsPage").then((m) => ({ default: m.SettingsPage })));
export const MorePage = lazy(() => import("./MorePage").then((m) => ({ default: m.MorePage })));
export const ComingSoonPage = lazy(() => import("./ComingSoonPage").then((m) => ({ default: m.ComingSoonPage })));
