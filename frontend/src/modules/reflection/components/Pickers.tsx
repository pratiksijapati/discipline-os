import { useId } from "react";
import { cn } from "../../../utils/cn";
import { DAY_RATINGS } from "../constants";
import styles from "./Review.module.css";

/** 😞 😐 🙂 😄 🔥 — radio buttons, so they work with keyboard and screen readers. */
export function RatingPicker({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const name = useId();
  return (
    <fieldset className={styles.rating}>
      <legend className={styles.question}>How was your day?</legend>
      <div className={styles.ratingRow}>
        {DAY_RATINGS.map((rating) => (
          <label key={rating.value} className={cn(styles.ratingOption, value === rating.value && styles.ratingSelected)}>
            <input
              type="radio"
              name={name}
              value={rating.value}
              checked={value === rating.value}
              onChange={() => onChange(rating.value)}
              className="visually-hidden"
            />
            <span className={styles.emoji} aria-hidden>
              {rating.emoji}
            </span>
            <span className={styles.ratingLabel}>{rating.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A 1–5 scale for energy and mood. */
export function ScalePicker({
  legend,
  value,
  onChange,
  low,
  high,
}: {
  legend: string;
  value: number | null;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  const name = useId();
  return (
    <fieldset className={styles.scale}>
      <legend className={styles.scaleLegend}>{legend}</legend>
      <div className={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={cn(styles.scaleOption, value === n && styles.scaleSelected)}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="visually-hidden"
            />
            <span aria-hidden>{n}</span>
            <span className="visually-hidden">
              {n} of 5{n === 1 ? ` (${low})` : n === 5 ? ` (${high})` : ""}
            </span>
          </label>
        ))}
      </div>
      <div className={styles.scaleEnds} aria-hidden>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}
