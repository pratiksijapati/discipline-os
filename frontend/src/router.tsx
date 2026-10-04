import { ChartLine, CalendarClock, Dumbbell, ListChecks, NotebookPen, Target } from "lucide-react";
import { createBrowserRouter, Navigate } from "react-router";
import { RedirectIfAuthenticated, RequireAuth } from "./auth/routeGuards";
import { AppShell } from "./layouts/AppShell";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ComingSoonPage, MorePage, SettingsPage, TodayPage } from "./pages/lazyPages";
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
          {
            path: "/schedule",
            element: (
              <ComingSoonPage
                title="My Day"
                icon={CalendarClock}
                description="Your timeline, recurring routine and morning routine — coming with the Today system."
              />
            ),
          },
          {
            path: "/workout",
            element: (
              <ComingSoonPage
                title="Workout"
                icon={Dumbbell}
                description="Workout plans, live sessions and history are on the way."
              />
            ),
          },
          {
            path: "/habits",
            element: (
              <ComingSoonPage
                title="Habits"
                icon={ListChecks}
                description="Tap-to-track habits with counts and durations are on the way."
              />
            ),
          },
          {
            path: "/growth",
            element: (
              <ComingSoonPage
                title="Goals"
                icon={Target}
                description="Personal growth goals with progress tracking are on the way."
              />
            ),
          },
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
          {
            path: "/reflection",
            element: (
              <ComingSoonPage
                title="Reflection"
                icon={NotebookPen}
                description="Your nightly review and daily score summary are on the way."
              />
            ),
          },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/more", element: <MorePage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
