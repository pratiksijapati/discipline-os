import { useMutation } from "@tanstack/react-query";
import { Monitor, Moon, Sun } from "lucide-react";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { useTheme } from "../../../theme/useTheme";
import type { ThemePreference } from "../../../types/auth";
import { settingsApi } from "../api";

const OPTIONS = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
  { value: "system" as const, label: "System", icon: Monitor },
];

export function AppearanceSection() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (settings) => setUser({ ...user, settings }),
    onError: (error) => toast(`Theme not saved: ${toApiError(error).message}`, "error"),
  });

  function handleChange(theme: ThemePreference) {
    setPreference(theme); // apply instantly; save in the background
    mutation.mutate({ theme });
  }

  return <SegmentedControl legend="Theme" value={preference} options={OPTIONS} onChange={handleChange} />;
}
