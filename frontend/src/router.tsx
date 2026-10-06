import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { RedirectIfAuthenticated, RequireAuth, RequireOnboarding } from "./auth/routeGuards";
import { FullScreenLoader } from "./components/StatusScreen";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import {
  GrowthPage,
  HabitsPage,
  MorePage,
  OnboardingPage,
  PrepareTomorrowPage,
  ProgressPage,
  ReflectionPage,
  RoutinePage,
  SchedulePage,
  SettingsPage,
  TasksPage,
  TodayPage,
  WakePage,
  WorkoutPage,
  WorkoutSessionPage,
} from "./pages/lazyPages";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RouteErrorPage } from "./pages/RouteErrorPage";

export const router = createBrowserRouter([
  {
    // Any crash below shows a friendly screen (and recovers from stale deploys).
    errorElement: <RouteErrorPage />,
    children: [
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
          // Full-screen, no navigation: opened from the wake-up notification.
          {
            path: "/wake",
            element: (
              <Suspense fallback={<FullScreenLoader />}>
                <WakePage />
              </Suspense>
            ),
          },
          // First-time setup, full screen.
          {
            path: "/welcome",
            element: (
              <Suspense fallback={<FullScreenLoader />}>
                <OnboardingPage />
              </Suspense>
            ),
          },
          {
            element: (
              <RequireOnboarding>
                <AppShell />
              </RequireOnboarding>
            ),
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
              { path: "/tomorrow", element: <PrepareTomorrowPage /> },
              { path: "/settings", element: <SettingsPage /> },
              { path: "/more", element: <MorePage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
