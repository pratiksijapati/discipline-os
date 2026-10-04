import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../../api/errors";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { FormAlert } from "../../components/ui/FormAlert";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { AuthLayout } from "../../layouts/AuthLayout";
import type { FieldErrors } from "../../types/api";
import { browserTimeZone } from "../../utils/date";
import styles from "./authForm.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate(): FieldErrors {
    const result: FieldErrors = {};
    if (!form.first_name.trim()) result.first_name = ["Enter your first name."];
    if (!EMAIL_PATTERN.test(form.email.trim())) result.email = ["Enter a valid email address."];
    if (form.password.length < 8) result.password = ["Use at least 8 characters."];
    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        timezone: browserTimeZone(),
      });
      navigate("/today", { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      setFormError(Object.keys(apiError.fieldErrors).length > 0 ? null : apiError.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Build your system"
      subtitle="Create your Discipline OS account."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />
        <div className={styles.row}>
          <TextField
            label="First name"
            autoComplete="given-name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            error={errors.first_name}
            autoFocus
          />
          <TextField
            label="Last name"
            optional
            autoComplete="family-name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            error={errors.last_name}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          hint="At least 8 characters. Avoid common words and your name."
        />
        <Button type="submit" size="lg" block loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
