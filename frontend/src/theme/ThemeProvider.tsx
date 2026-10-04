import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemePreference } from "../types/auth";
import { ThemeContext } from "./ThemeContext";
import { applyTheme, readStoredPreference, storePreference, systemTheme, watchSystemTheme } from "./theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [system, setSystem] = useState(systemTheme);

  useEffect(() => watchSystemTheme(setSystem), []);

  const resolved = preference === "system" ? system : preference;

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    storePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
