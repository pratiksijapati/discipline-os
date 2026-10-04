import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../utils/cn";
import styles from "./Field.module.css";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  errors: string[];
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

function toList(error?: string | string[]): string[] {
  if (!error) return [];
  return Array.isArray(error) ? error : [error];
}

function describedBy(id: string, hasHint: boolean, hasErrors: boolean): string | undefined {
  const ids = [hasHint && `${id}-hint`, hasErrors && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function FieldShell({ id, label, hint, errors, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {errors.length > 0 && (
        <div id={`${id}-error`} className={styles.error}>
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | string[];
  optional?: boolean;
}

export function TextField({ label, hint, error, optional, id, className, ...inputProps }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errors = toList(error);
  return (
    <FieldShell id={fieldId} label={label} hint={hint} errors={errors} optional={optional} className={className}>
      <input
        id={fieldId}
        className={styles.control}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), errors.length > 0)}
        {...inputProps}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string | string[];
  optional?: boolean;
}

export function TextAreaField({ label, hint, error, optional, id, className, ...textareaProps }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errors = toList(error);
  return (
    <FieldShell id={fieldId} label={label} hint={hint} errors={errors} optional={optional} className={className}>
      <textarea
        id={fieldId}
        className={cn(styles.control, styles.textarea)}
        rows={3}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), errors.length > 0)}
        {...textareaProps}
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
  hint?: ReactNode;
  error?: string | string[];
}

export function SelectField({ label, options, hint, error, id, className, ...selectProps }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errors = toList(error);
  return (
    <FieldShell id={fieldId} label={label} hint={hint} errors={errors} className={className}>
      <select
        id={fieldId}
        className={cn(styles.control, styles.select)}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), errors.length > 0)}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
