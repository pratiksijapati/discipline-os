import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toApiError } from "../../api/errors";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { FormAlert } from "../../components/ui/FormAlert";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { AuthLayout } from "../../layouts/AuthLayout";
import type { FieldErrors } from "../../types/api";
import styles from "./authForm.module.css";

export function LoginPage() {
  useDocumentTitle("Log in");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/today";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!email.trim()) nextErrors.email = ["Enter your email."];
    if (!password) nextErrors.password = ["Enter your password."];
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (error) {
      const apiError = toApiError(error);
      setErrors(apiError.fieldErrors);
      setFormError(apiError.status === 401 ? "That email and password don't match." : apiError.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see what's next today."
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" size="lg" block loading={submitting}>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
