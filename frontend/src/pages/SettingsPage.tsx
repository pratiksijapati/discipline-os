import { LogOut } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { AppearanceSection } from "../modules/settings/components/AppearanceSection";
import { ChangePasswordForm } from "../modules/settings/components/ChangePasswordForm";
import { PreferencesForm } from "../modules/settings/components/PreferencesForm";
import { ProfileForm } from "../modules/settings/components/ProfileForm";
import styles from "../modules/settings/Settings.module.css";

export function SettingsPage() {
  useDocumentTitle("Settings");
  const { logout } = useAuth();

  return (
    <>
      <PageHeader title="Settings" />
      <div className={styles.sections}>
        <Card aria-labelledby="settings-profile">
          <h2 id="settings-profile" className={styles.sectionTitle}>
            Profile
          </h2>
          <p className={styles.sectionHint}>How Discipline OS greets you and keeps time.</p>
          <ProfileForm />
        </Card>

        <Card aria-labelledby="settings-appearance">
          <h2 id="settings-appearance" className={styles.sectionTitle}>
            Appearance
          </h2>
          <p className={styles.sectionHint}>System follows your phone or computer setting.</p>
          <AppearanceSection />
        </Card>

        <Card aria-labelledby="settings-preferences">
          <h2 id="settings-preferences" className={styles.sectionTitle}>
            Week &amp; workouts
          </h2>
          <p className={styles.sectionHint}>How your weeks are counted and what you aim for.</p>
          <PreferencesForm />
        </Card>

        <Card aria-labelledby="settings-password">
          <h2 id="settings-password" className={styles.sectionTitle}>
            Password
          </h2>
          <p className={styles.sectionHint}>Use at least 8 characters.</p>
          <ChangePasswordForm />
        </Card>

        <Button variant="danger" size="lg" block icon={<LogOut size={20} aria-hidden />} onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </>
  );
}
