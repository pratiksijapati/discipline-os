import { api } from "../../api/client";
import type { NotificationPreferences, PushConfig } from "./types";

export const notificationsApi = {
  config: () => api.get<PushConfig>("/notifications/config/").then((r) => r.data),
  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post<{ devices: number }>("/notifications/subscriptions/", subscription).then((r) => r.data),
  unsubscribe: (endpoint: string) =>
    api.delete<{ devices: number }>("/notifications/subscriptions/", { data: { endpoint } }).then((r) => r.data),
  preferences: () => api.get<NotificationPreferences>("/notifications/preferences/").then((r) => r.data),
  updatePreferences: (input: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>("/notifications/preferences/", input).then((r) => r.data),
  /** With `endpoint`, only this device is tried and `this_device` says whether it got it. */
  test: (endpoint?: string) =>
    api.post<{ delivered: number; this_device: boolean }>("/notifications/test/", endpoint ? { endpoint } : {}).then((r) => r.data),
};
