import { createContext } from "react";
import type { ThemePreference } from "../types/auth";
import type { ResolvedTheme } from "./theme";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
