import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { toApiError } from "../api/errors";
import { useAuth, useCurrentUser } from "../auth/useAuth";
import { useToast } from "../components/toast/useToast";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  DoneStep,
  GrowthStep,
  HabitsStep,
  MorningStep,
  RemindersStep,
  WakeStep,
  WelcomeStep,
  WorkoutStep,
} from "../modules/onboarding/components/Steps";
import styles from "../modules/onboarding/components/Onboarding.module.css";
import { settingsApi } from "../modules/settings/api";

const STEPS = ["welcome", "wake", "morning", "workout", "habits", "growth", "reminders", "done"] as const;
const COUNTED = STEPS.length - 2; // "welcome" and "done" aren't numbered

/** First-time setup, shown once to new accounts. Each step saves as you go. */
export function OnboardingPage() {
  useDocumentTitle("Set up");
  const user = useCurrentUser();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [habitCount, setHabitCount] = useState(0);
  const [finishing, setFinishing] = useState(false);

  if (user.settings.onboarding_completed !== false) return <Navigate to="/today" replace />;

  const step = STEPS[index];
  const next = () => {
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };

  async function finish() {
    setFinishing(true);
    try {
      const settings = await settingsApi.update({ onboarding_completed: true });
      setUser({ ...user, settings });
      await queryClient.invalidateQueries();
      navigate("/today", { replace: true });
    } catch (error) {
      toast(toApiError(error).message, "error");
      setFinishing(false);
    }
  }

  return (
    <div className={styles.page}>
      {step !== "welcome" && step !== "done" && (
        <div className={styles.top}>
          <button type="button" className={styles.back} onClick={() => setIndex((i) => i - 1)} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={COUNTED}
            aria-valuenow={index}
            aria-label="Setup progress"
          >
            <span style={{ width: `${(index / COUNTED) * 100}%` }} />
          </div>
          <span className={styles.stepCount}>
            {index} of {COUNTED}
          </span>
        </div>
      )}

      <main className={styles.body}>
        {step === "welcome" && <WelcomeStep onNext={next} onSkip={() => void finish()} />}
        {step === "wake" && <WakeStep onNext={next} />}
        {step === "morning" && <MorningStep onNext={next} />}
        {step === "workout" && <WorkoutStep onNext={next} />}
        {step === "habits" && <HabitsStep onNext={next} onCount={setHabitCount} />}
        {step === "growth" && <GrowthStep onNext={next} />}
        {step === "reminders" && <RemindersStep onNext={next} />}
        {step === "done" && <DoneStep habits={habitCount} busy={finishing} onFinish={() => void finish()} />}
      </main>
    </div>
  );
}
