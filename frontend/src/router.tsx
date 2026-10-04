import { createBrowserRouter, Navigate } from "react-router";
import { RedirectIfAuthenticated, RequireAuth } from "./auth/routeGuards";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import {
  GrowthPage,
  HabitsPage,
  MorePage,
  ProgressPage,
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
          { path: "/progress", element: <ProgressPage /> },
          { path: "/reflection", element: <ReflectionPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/more", element: <MorePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
