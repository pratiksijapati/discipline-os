import { createContext } from "react";
import type { LoginPayload, RegisterPayload, User } from "../types/auth";

/**
 * loading         – checking for a saved session on startup
 * authenticated   – user is known
 * unauthenticated – show login
 * offline         – a saved session exists but the server can't be reached; offer retry
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "offline";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
