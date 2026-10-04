import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { tokenStorage } from "../../../api/tokenStorage";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import type { FieldErrors } from "../../../types/api";
import { authApi } from "../../auth/api";
import styles from "../Settings.module.css";

const EMPTY = { current_password: "", new_password: "", confirm: "" };

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (tokens) => {
      // The server logged out every other device and issued fresh tokens for this one.
      tokenStorage.setTokens(tokens);
      setForm(EMPTY);
      toast("Password changed ✓");
    },
  });

  const apiError = mutation.error ? toApiError(mutation.error) : null;
  const errors: FieldErrors = { ...(apiError?.fieldErrors ?? {}), ...localErrors };

  function update(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!form.current_password) next.current_password = ["Enter your current password."];
    if (form.new_password.length < 8) next.new_password = ["Use at least 8 characters."];
    if (form.confirm !== form.new_password) next.confirm = ["Passwords don't match."];
    setLocalErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate({ current_password: form.current_password, new_password: form.new_password });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={apiError && Object.keys(apiError.fieldErrors).length === 0 ? apiError.message : null} />
      <TextField
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={form.current_password}
        onChange={(e) => update("current_password", e.target.value)}
        error={errors.current_password}
      />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={form.new_password}
        onChange={(e) => update("new_password", e.target.value)}
        error={errors.new_password}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={(e) => update("confirm", e.target.value)}
        error={errors.confirm}
        hint="Other devices will be logged out."
      />
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" loading={mutation.isPending}>
          Change password
        </Button>
      </div>
    </form>
  );
}
