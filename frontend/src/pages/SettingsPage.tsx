import { LogOut } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { InstallCard } from "../components/pwa/InstallCard";
import { Card } from "../components/ui/Card";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { AppearanceSection } from "../modules/settings/components/AppearanceSection";
import { ChangePasswordForm } from "../modules/settings/components/ChangePasswordForm";
import { DisciplineSettingsForm } from "../modules/settings/components/DisciplineSettingsForm";
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

        <Card aria-labelledby="settings-discipline">
          <h2 id="settings-discipline" className={styles.sectionTitle}>
            Discipline score
          </h2>
          <p className={styles.sectionHint}>
            Parts you haven't set up never count against you. Past days keep the score they had.
          </p>
          <DisciplineSettingsForm />
        </Card>

        <Card aria-labelledby="settings-app">
          <h2 id="settings-app" className={styles.sectionTitle}>
            App
          </h2>
          <p className={styles.sectionHint}>Install Discipline OS to open it from your home screen.</p>
          <InstallCard />
          <p className={styles.version}>
            Version {new Date(__BUILD_TIME__).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
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
