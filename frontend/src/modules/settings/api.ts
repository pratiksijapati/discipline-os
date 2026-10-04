import { api } from "../../api/client";
import type { SettingsUpdate, UserSettings } from "../../types/auth";

export const settingsApi = {
  update: (payload: SettingsUpdate) => api.patch<UserSettings>("/settings/", payload).then((r) => r.data),
};
