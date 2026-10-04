import { api } from "../../api/client";
import type { ChallengeMethod, ChallengeType, CompletedSession, WakeSession, WakeToday } from "./types";

export const wakeApi = {
  today: () => api.get<WakeToday>("/wake/today/").then((r) => r.data),
  start: (method: ChallengeMethod, challengeType?: ChallengeType) =>
    api.post<WakeSession>("/wake/sessions/", { method, challenge_type: challengeType }).then((r) => r.data),
  complete: (id: number, input: { active_seconds?: number; answers?: number[] }) =>
    api.post<CompletedSession>(`/wake/sessions/${id}/complete/`, input).then((r) => r.data),
};
