import { useMutation } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { SelectField, TextField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import { listTimeZones } from "../../../utils/date";
import { authApi } from "../../auth/api";
import styles from "../Settings.module.css";

export function ProfileForm() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [localError, setLocalError] = useState<string | null>(null);

  const timezoneOptions = useMemo(
    () => listTimeZones(user.timezone).map((zone) => ({ value: zone, label: zone.replaceAll("_", " ") })),
    [user.timezone],
  );

  const mutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => {
      setUser(updated);
      toast("Profile saved ✓");
    },
  });

  const apiError = mutation.error ? toApiError(mutation.error) : null;
  const fieldErrors = apiError?.fieldErrors ?? {};
  const isDirty = firstName !== user.first_name || lastName !== user.last_name || timezone !== user.timezone;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName.trim()) {
      setLocalError("First name can't be empty.");
      return;
    }
    setLocalError(null);
    mutation.mutate({ first_name: firstName.trim(), last_name: lastName.trim(), timezone });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormAlert message={localError ?? (apiError && Object.keys(fieldErrors).length === 0 ? apiError.message : null)} />
      <TextField label="Email" value={user.email} readOnly hint="Your email is your login and can't be changed here." />
      <div className={styles.row}>
        <TextField
          label="First name"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={fieldErrors.first_name}
        />
        <TextField
          label="Last name"
          optional
          autoComplete="family-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={fieldErrors.last_name}
        />
      </div>
      <SelectField
        label="Timezone"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        options={timezoneOptions}
        error={fieldErrors.timezone}
        hint="Decides when your day starts and ends."
      />
      <div className={styles.actions}>
        <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
