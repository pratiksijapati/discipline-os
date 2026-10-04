import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import styles from "./SegmentedControl.module.css";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: Array<Option<T>>;
  onChange: (value: T) => void;
}

/** Built on real radio inputs, so keyboard and screen readers work by default. */
export function SegmentedControl<T extends string>({ legend, value, options, onChange }: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{legend}</legend>
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <label key={optionValue} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={optionValue}
            checked={value === optionValue}
            onChange={() => onChange(optionValue)}
            className={styles.input}
          />
          <span className={styles.face}>
            {Icon && <Icon size={18} aria-hidden />}
            {label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
