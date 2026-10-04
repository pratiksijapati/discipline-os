import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onSessionExpired, refreshAccessToken } from "../api/client";
import { toApiError } from "../api/errors";
import { tokenStorage } from "../api/tokenStorage";
import { authApi } from "../modules/auth/api";
import { useTheme } from "../theme/useTheme";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "../types/auth";
import { AuthContext, type AuthStatus } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { setPreference } = useTheme();
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.getRefresh() ? "loading" : "unauthenticated"));
  const [user, setUserState] = useState<User | null>(null);

  const startSession = useCallback(
    (nextUser: User) => {
      setUserState(nextUser);
      setStatus("authenticated");
      setPreference(nextUser.settings.theme);
    },
    [setPreference],
  );

  const endSession = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setUserState(null);
    setStatus("unauthenticated");
  }, [queryClient]);

  /** Restore a saved session: refresh token → access token → /me. */
  const restore = useCallback(async () => {
    try {
      await refreshAccessToken();
      startSession(await authApi.me());
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.isNetworkError || apiError.isServerError) setStatus("offline");
      else endSession();
    }
  }, [startSession, endSession]);

  // On startup. Initial status is already "loading" when a refresh token exists.
  useEffect(() => {
    // restore() only sets state after its network calls resolve, never synchronously.
    // eslint-disable-next-line react/set-state-in-effect
    if (tokenStorage.getRefresh()) void restore();
  }, [restore]);

  useEffect(() => {
    onSessionExpired(endSession);
    return () => onSessionExpired(null);
  }, [endSession]);

  const handleAuthResponse = useCallback(
    (response: AuthResponse) => {
      tokenStorage.setTokens(response);
      startSession(response.user);
      return response.user;
    },
    [startSession],
  );

  const login = useCallback(
    async (payload: LoginPayload) => handleAuthResponse(await authApi.login(payload)),
    [handleAuthResponse],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => handleAuthResponse(await authApi.register(payload)),
    [handleAuthResponse],
  );

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // Logging out locally still works even if the server call fails.
      }
    }
    endSession();
  }, [endSession]);

  const retry = useCallback(() => {
    setStatus("loading");
    void restore();
  }, [restore]);

  const value = useMemo(
    () => ({ status, user, login, register, logout, setUser: setUserState, retry }),
    [status, user, login, register, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
