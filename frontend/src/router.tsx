import { ChartLine } from "lucide-react";
import { createBrowserRouter, Navigate } from "react-router";
import { RedirectIfAuthenticated, RequireAuth } from "./auth/routeGuards";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import {
  ComingSoonPage,
  GrowthPage,
  HabitsPage,
  MorePage,
  ReflectionPage,
  RoutinePage,
  SchedulePage,
  SettingsPage,
  TasksPage,
  TodayPage,
  WorkoutPage,
  WorkoutSessionPage,
} from "./pages/lazyPages";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/today" replace /> },
          { path: "/today", element: <TodayPage /> },
          { path: "/schedule", element: <SchedulePage /> },
          { path: "/tasks", element: <TasksPage /> },
          { path: "/workout", element: <WorkoutPage /> },
          { path: "/workout/session/:id", element: <WorkoutSessionPage /> },
          { path: "/habits", element: <HabitsPage /> },
          { path: "/routine", element: <RoutinePage /> },
          { path: "/growth", element: <GrowthPage /> },
          {
            path: "/progress",
            element: (
              <ComingSoonPage
                title="Progress"
                icon={ChartLine}
                description="Discipline score trends, streaks and weekly reviews are on the way."
              />
            ),
          },
          { path: "/reflection", element: <ReflectionPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/more", element: <MorePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
