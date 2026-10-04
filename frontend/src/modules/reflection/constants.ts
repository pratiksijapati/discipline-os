export const DAY_RATINGS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😐", label: "Meh" },
  { value: 3, emoji: "🙂", label: "Good" },
  { value: 4, emoji: "😄", label: "Great" },
  { value: 5, emoji: "🔥", label: "On fire" },
];

export function ratingEmoji(value: number | null | undefined): string {
  return DAY_RATINGS.find((r) => r.value === value)?.emoji ?? "";
}

export function ratingLabel(value: number | null | undefined): string {
  return DAY_RATINGS.find((r) => r.value === value)?.label ?? "";
}
