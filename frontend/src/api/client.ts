/*
 * The only configured HTTP client. Every API module imports `api` from here.
 *
 * - Attaches the access token to each request.
 * - On a 401, refreshes the access token once and replays the request.
 * - Several requests failing at the same moment share ONE refresh call.
 * - If the refresh itself is rejected, the session is cleared and the app
 *   is told (via onSessionExpired) so it can show the login page.
 * - Every failure reaches callers as an ApiError.
 */

import axios, { type InternalAxiosRequestConfig } from "axios";
import { ApiError, toApiError } from "./errors";
import { tokenStorage } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) {
  throw new Error("VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env.");
}

export const api = axios.create({ baseURL, timeout: 15_000 });

/** Used only for the refresh call, so it never triggers the interceptors below. */
const bareClient = axios.create({ baseURL, timeout: 15_000 });

const NO_REFRESH_PATHS = ["/auth/login/", "/auth/register/", "/auth/refresh/", "/auth/logout/"];

let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

async function requestNewAccessToken(retriedWithNewer = false): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new ApiError("Your session has ended. Please log in again.", 401);

  try {
    const { data } = await bareClient.post<{ access: string; refresh?: string }>("/auth/refresh/", { refresh });
    tokenStorage.setAccess(data.access);
    if (data.refresh) tokenStorage.setRefresh(data.refresh);
    return data.access;
  } catch (error) {
    // Another open tab may have rotated the refresh token a moment earlier.
    const latest = tokenStorage.getRefresh();
    if (!retriedWithNewer && latest && latest !== refresh) {
      return requestNewAccessToken(true);
    }
    throw toApiError(error);
  }
}

let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= requestNewAccessToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(toApiError(error));

    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? "";
    const canRefresh =
      error.response?.status === 401 &&
      config !== undefined &&
      !config._retried &&
      !NO_REFRESH_PATHS.some((path) => url.startsWith(path)) &&
      tokenStorage.getRefresh() !== null;

    if (!canRefresh) return Promise.reject(toApiError(error));

    config._retried = true;
    try {
      const access = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${access}`;
      return api(config);
    } catch (refreshError) {
      const apiError = toApiError(refreshError);
      // Only log out when the server rejected the token — not when we're just offline.
      if (!apiError.isNetworkError && !apiError.isServerError) {
        tokenStorage.clear();
        sessionExpiredHandler?.();
      }
      return Promise.reject(apiError);
    }
  },
);
