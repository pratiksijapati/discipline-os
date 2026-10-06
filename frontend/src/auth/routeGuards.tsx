import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { ConnectionProblem, FullScreenLoader } from "../components/StatusScreen";
import { useAuth } from "./useAuth";

interface FromState {
  from?: string;
}

/** Wraps every private route. */
export function RequireAuth() {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenLoader />;
  if (status === "offline") return <ConnectionProblem onRetry={retry} />;
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search } satisfies FromState} />;
  }
  return <Outlet />;
}

/** Wraps /login and /register: logged-in users go straight to the app. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenLoader />;
  if (status === "authenticated") {
    const from = (location.state as FromState | null)?.from;
    return <Navigate to={from && from !== "/login" ? from : "/today"} replace />;
  }
  return <Outlet />;
}

/**
 * New accounts go through setup once. Only an explicit `false` counts: an older server
 * that doesn't send the flag yet must never push existing users into the wizard.
 */
export function RequireOnboarding({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  if (user && user.settings.onboarding_completed === false) return <Navigate to="/welcome" replace />;
  return children ?? <Outlet />;
}
