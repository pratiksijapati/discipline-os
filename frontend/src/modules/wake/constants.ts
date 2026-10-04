import type { ChallengeType } from "./types";

export const CHALLENGE_LABEL: Record<ChallengeType, { title: string; verb: string }> = {
  dance: { title: "Dance challenge", verb: "Dance" },
  jumping_jacks: { title: "Jumping jacks", verb: "Do jumping jacks" },
  squats: { title: "Squats", verb: "Do squats" },
  math: { title: "Math challenge", verb: "Solve" },
};

export const CHALLENGE_TYPE_OPTIONS: Array<{ value: ChallengeType; label: string }> = [
  { value: "dance", label: "Dance (camera)" },
  { value: "jumping_jacks", label: "Jumping jacks (camera)" },
  { value: "squats", label: "Squats (camera)" },
  { value: "math", label: "Math problems" },
];
