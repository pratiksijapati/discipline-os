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
