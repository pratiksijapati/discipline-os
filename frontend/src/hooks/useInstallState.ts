import { useSyncExternalStore } from "react";
import { getInstallState, subscribeInstall, type InstallState } from "../services/pwa";

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribeInstall, getInstallState, () => "unsupported");
}
