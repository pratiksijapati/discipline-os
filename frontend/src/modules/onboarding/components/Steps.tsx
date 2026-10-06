import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toApiError } from "../../../api/errors";
import { useAuth, useCurrentUser } from "../../../auth/useAuth";
import { Button } from "../../../components/ui/Button";
import { DayPicker } from "../../../components/ui/DayPicker";
import { FormAlert } from "../../../components/ui/FormAlert";
import { TextField } from "../../../components/ui/Field";
import type { SettingsUpdate } from "../../../types/auth";
import { cn } from "../../../utils/cn";
import { formatTime, toInputTime } from "../../../utils/time";
import { GoalForm } from "../../goals/components/GoalForm";
import { GOAL_CATEGORY_META } from "../../goals/constants";
import type { GoalCategory } from "../../goals/types";
import { habitsApi } from "../../habits/api";
import { NotificationSettings } from "../../notifications/components/NotificationSettings";
import { routineApi } from "../../routine/api";
import { settingsApi } from "../../settings/api";
import type { ChallengeType } from "../../wake/types";
import { plansApi } from "../../workouts/api";
import {
  CHALLENGE_SECONDS,
  GRACE_OPTIONS,
  GROWTH_AREAS,
  HABIT_STARTERS,
  MAX_HABITS,
  MORNING_DEFAULTS,
  MORNING_STARTERS,
} from "../constants";
import styles from "./Onboarding.module.css";

export interface StepProps {
  onNext: () => void;
}

/* ---------- shared bits ---------- */

function Chip({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} className={cn(styles.chip, selected && styles.chipOn)} onClick={onClick}>
      {children}
    </button>
  );
}

function StepFooter({ busy, onNext, label = "Next", secondary }: { busy?: boolean; onNext: () => void; label?: string; secondary?: ReactNode }) {
  return (
    <div className={styles.footer}>
      <Button size="lg" block loading={busy} onClick={onNext}>
        {label}
      </Button>
      {secondary}
    </div>
  );
}

/** Saves settings and keeps the signed-in user in sync. */
function useSaveSettings() {
  const user = useCurrentUser();
  const { setUser } = useAuth();
  return async (payload: SettingsUpdate) => {
    const settings = await settingsApi.update(payload);
    setUser({ ...user, settings });
  };
}

/* ---------- 1. welcome ---------- */

export function WelcomeStep({ onNext, onSkip }: StepProps & { onSkip: () => void }) {
  const user = useCurrentUser();
  return (
    <div className={styles.center}>
      <p className={styles.emoji} aria-hidden>
        👋
      </p>
      <h1 className={styles.title}>Welcome to Discipline OS, {user.first_name}.</h1>
      <p className={styles.lead}>Let's build your daily system. It takes only a few minutes, and you can change everything later.</p>
      <StepFooter
        onNext={onNext}
        label="Get started"
        secondary={
          <button type="button" className={styles.textButton} onClick={onSkip}>
            Skip setup
          </button>
        }
      />
    </div>
  );
}

/* ---------- 2. wake up ---------- */

export function WakeStep({ onNext }: StepProps) {
  const user = useCurrentUser();
  const save = useSaveSettings();
  const s = user.settings;
  const [time, setTime] = useState(toInputTime(s.wake_time) || "06:00");
  const [grace, setGrace] = useState(GRACE_OPTIONS.includes(s.wake_grace_minutes) ? s.wake_grace_minutes : 10);
  const [challenge, setChallenge] = useState<ChallengeType | "none">(s.wake_challenge_enabled ? s.wake_challenge_type : "none");
  const [seconds, setSeconds] = useState(CHALLENGE_SECONDS.includes(s.wake_challenge_seconds) ? s.wake_challenge_seconds : 60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next() {
    setBusy(true);
    setError(null);
    try {
      await save({
        wake_time: time,
        wake_grace_minutes: grace,
        wake_challenge_enabled: challenge !== "none",
        ...(challenge !== "none" && { wake_challenge_type: challenge, wake_challenge_seconds: seconds }),
      });
      onNext();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  const types: Array<[ChallengeType, string]> = [
    ["dance", "Dance"],
    ["squats", "Squats"],
    ["jumping_jacks", "Jumping jacks"],
    ["math", "Math"],
  ];
  return (
    <>
      <h1 className={styles.title}>When do you want to wake up?</h1>
      <FormAlert message={error} />
      <TextField label="Wake-up time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <fieldset className={styles.group}>
        <legend>On time if you're up within</legend>
        <div className={styles.chips}>
          {GRACE_OPTIONS.map((m) => (
            <Chip key={m} selected={grace === m} onClick={() => setGrace(m)}>
              {m} min
            </Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Wake-up challenge</legend>
        <p className={styles.hint}>A short activity that proves you're really up.</p>
        <div className={styles.chips}>
          {types.map(([t, label]) => (
            <Chip key={t} selected={challenge === t} onClick={() => setChallenge(t)}>
              {label}
            </Chip>
          ))}
          <Chip selected={challenge === "none"} onClick={() => setChallenge("none")}>
            None
          </Chip>
        </div>
      </fieldset>
      {challenge !== "none" && challenge !== "math" && (
        <fieldset className={styles.group}>
          <legend>Challenge length</legend>
          <div className={styles.chips}>
            {CHALLENGE_SECONDS.map((sec) => (
              <Chip key={sec} selected={seconds === sec} onClick={() => setSeconds(sec)}>
                {sec < 120 ? `${sec} sec` : "2 min"}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      <StepFooter busy={busy} onNext={() => void next()} />
    </>
  );
}

/* ---------- 3. morning routine ---------- */

export function MorningStep({ onNext }: StepProps) {
  const user = useCurrentUser();
  // The wake step ticks itself when the challenge is done; without a challenge it's a simple "Wake up" tick.
  const wakeStep = user.settings.wake_challenge_enabled ? "Wake-up challenge" : "Wake up";
  const existing = useQuery({ queryKey: ["onboarding", "routines"], queryFn: routineApi.list });
  const hasRoutine = (existing.data ?? []).some((r) => r.is_default);

  const [options, setOptions] = useState([wakeStep, ...MORNING_STARTERS]);
  const [picked, setPicked] = useState<string[]>([wakeStep, ...MORNING_DEFAULTS]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (!options.includes(name)) setOptions((o) => [...o, name]);
    if (!picked.includes(name)) setPicked((p) => [...p, name]);
    setCustom("");
  };

  async function next() {
    if (hasRoutine || picked.length === 0) return onNext();
    setBusy(true);
    setError(null);
    try {
      // Keep the order the options are shown in.
      const items = options.filter((o) => picked.includes(o)).map((title) => ({ title }));
      await routineApi.create({ name: "Morning routine", is_default: true, items });
      onNext();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>Your morning routine</h1>
      <p className={styles.lead}>Small steps that start your day — tick them off each morning.</p>
      <FormAlert message={error} />
      {hasRoutine ? (
        <p className={styles.note}>You already have a morning routine. You can edit it any time under More → Morning routine.</p>
      ) : (
        <>
          <div className={styles.checklist}>
            {options.map((name) => (
              <label key={name} className={styles.check}>
                <input type="checkbox" checked={picked.includes(name)} onChange={() => toggle(name)} />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
          >
            <TextField label="Add your own step" placeholder="e.g. Stretch" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <Button type="submit" variant="secondary" icon={<Plus size={18} aria-hidden />} disabled={!custom.trim()}>
              Add
            </Button>
          </form>
        </>
      )}
      <StepFooter busy={busy} onNext={() => void next()} label={!hasRoutine && picked.length === 0 ? "Skip for now" : "Next"} />
    </>
  );
}

/* ---------- 4. workout ---------- */

export function WorkoutStep({ onNext }: StepProps) {
  const user = useCurrentUser();
  const save = useSaveSettings();
  const plans = useQuery({ queryKey: ["onboarding", "plans"], queryFn: plansApi.list });
  const [target, setTarget] = useState(user.settings.weekly_workout_target || 4);
  const [days, setDays] = useState<number[]>([]);
  const [plan, setPlan] = useState<number | "starter" | "later">("starter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existing = plans.data ?? [];

  async function next() {
    if (plan !== "later" && days.length === 0) return setError("Pick the days you'll train, or choose “Set up later”.");
    setBusy(true);
    setError(null);
    try {
      await save({ weekly_workout_target: target });
      if (plan === "starter") {
        const created = await plansApi.starter();
        const fullBody = created.find((p) => p.name.startsWith("Full Body")) ?? created[0];
        if (fullBody) await plansApi.update(fullBody.id, { days_of_week: days });
      } else if (plan !== "later") {
        await plansApi.update(plan, { days_of_week: days });
      }
      onNext();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>Workouts</h1>
      <FormAlert message={error} />
      <fieldset className={styles.group}>
        <legend>How many workouts per week?</legend>
        <div className={styles.chips}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} selected={target === n} onClick={() => setTarget(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </fieldset>
      <DayPicker legend="Which days?" value={days} onChange={setDays} weekStart={user.settings.week_start} />
      <fieldset className={styles.group}>
        <legend>Workout plan</legend>
        <div className={styles.checklist}>
          {existing.map((p) => (
            <label key={p.id} className={styles.check}>
              <input type="radio" name="plan" checked={plan === p.id} onChange={() => setPlan(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
          {existing.length === 0 && (
            <label className={styles.check}>
              <input type="radio" name="plan" checked={plan === "starter"} onChange={() => setPlan("starter")} />
              <span>
                Use the starter <strong>Full Body</strong> workout
              </span>
            </label>
          )}
          <label className={styles.check}>
            <input type="radio" name="plan" checked={plan === "later"} onChange={() => setPlan("later")} />
            <span>Set up later</span>
          </label>
        </div>
      </fieldset>
      <StepFooter busy={busy} onNext={() => void next()} />
    </>
  );
}

/* ---------- 5. habits ---------- */

export function HabitsStep({ onNext, onCount }: StepProps & { onCount: (n: number) => void }) {
  const [options, setOptions] = useState(HABIT_STARTERS);
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = picked.length >= MAX_HABITS;

  const toggle = (name: string) => setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : full ? p : [...p, name]));
  const addCustom = () => {
    const name = custom.trim();
    if (!name || full) return;
    if (!options.some((o) => o.name === name)) setOptions((o) => [...o, { name, habit_type: "boolean", category: "productivity" }]);
    if (!picked.includes(name)) setPicked((p) => [...p, name]);
    setCustom("");
  };

  async function next() {
    setBusy(true);
    setError(null);
    try {
      for (const habit of options.filter((o) => picked.includes(o.name))) await habitsApi.create(habit);
      onCount(picked.length);
      onNext();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className={styles.title}>Pick a few habits</h1>
      <p className={styles.lead}>3 to 5 is plenty. Fewer habits you actually keep beat a long list.</p>
      <FormAlert message={error} />
      <div className={styles.chips}>
        {options.map((h) => (
          <Chip key={h.name} selected={picked.includes(h.name)} disabled={full && !picked.includes(h.name)} onClick={() => toggle(h.name)}>
            {h.name}
          </Chip>
        ))}
      </div>
      <p className={styles.counter} aria-live="polite">
        {picked.length} of {MAX_HABITS} chosen{full && " — that's the most we suggest to start"}
      </p>
      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
      >
        <TextField label="Create your own" placeholder="e.g. Practice guitar" value={custom} disabled={full} onChange={(e) => setCustom(e.target.value)} />
        <Button type="submit" variant="secondary" icon={<Plus size={18} aria-hidden />} disabled={!custom.trim() || full}>
          Add
        </Button>
      </form>
      <StepFooter busy={busy} onNext={() => void next()} label={picked.length === 0 ? "Skip for now" : "Next"} />
    </>
  );
}

/* ---------- 6. growth ---------- */

export function GrowthStep({ onNext }: StepProps) {
  const [area, setArea] = useState<GoalCategory | null>(null);
  return (
    <>
      <h1 className={styles.title}>What do you want to improve?</h1>
      <p className={styles.lead}>Pick one area and set a goal — or skip and add goals later.</p>
      <div className={styles.chips}>
        {GROWTH_AREAS.map((c) => (
          <Chip key={c} selected={area === c} onClick={() => setArea(c)}>
            {GOAL_CATEGORY_META[c].label}
          </Chip>
        ))}
      </div>
      {area && (
        <div className={styles.goalForm}>
          <GoalForm key={area} initialCategory={area} onDone={onNext} />
        </div>
      )}
      <div className={styles.footer}>
        <button type="button" className={styles.textButton} onClick={onNext}>
          Skip for now
        </button>
      </div>
    </>
  );
}

/* ---------- 7. reminders ---------- */

export function RemindersStep({ onNext }: StepProps) {
  return (
    <>
      <h1 className={styles.title}>Reminders</h1>
      <p className={styles.lead}>Gentle nudges at the right moment. Turn them on, then choose which ones you want.</p>
      <NotificationSettings />
      <StepFooter onNext={onNext} />
    </>
  );
}

/* ---------- done ---------- */

export function DoneStep({ habits, onFinish, busy }: { habits: number; onFinish: () => void; busy: boolean }) {
  const user = useCurrentUser();
  const s = user.settings;
  const rows: Array<[string, string]> = [
    ["Wake-up", formatTime(s.wake_time)],
    ["Workout target", `${s.weekly_workout_target} / week`],
    ["Habits", String(habits)],
    ["Discipline target", `${s.streak_threshold}+`],
  ];
  return (
    <div className={styles.center}>
      <p className={styles.emoji} aria-hidden>
        ✅
      </p>
      <h1 className={styles.title}>Your Discipline OS is ready.</h1>
      <dl className={styles.summary}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <StepFooter busy={busy} onNext={onFinish} label="Start today" />
    </div>
  );
}
