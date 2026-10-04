/*
 * Access token: kept only in memory (lost on reload, which is fine — it lives 15 minutes).
 * Refresh token: kept in localStorage so the session survives closing the app.
 * See the auth decision in the project plan for why we don't use cookies.
 */

import type { AuthTokens } from "../types/auth";

const REFRESH_KEY = "dos.refresh";

let accessToken: string | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.) — the session just won't persist.
  }
}

export const tokenStorage = {
  getAccess: (): string | null => accessToken,
  setAccess: (token: string | null): void => {
    accessToken = token;
  },
  getRefresh: (): string | null => read(REFRESH_KEY),
  setRefresh: (token: string | null): void => write(REFRESH_KEY, token),
  setTokens(tokens: AuthTokens): void {
    accessToken = tokens.access;
    write(REFRESH_KEY, tokens.refresh);
  },
  clear(): void {
    accessToken = null;
    write(REFRESH_KEY, null);
  },
};
