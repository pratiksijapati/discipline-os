import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, BellRing, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toApiError } from "../../../api/errors";
import { queryKeys } from "../../../api/queryKeys";
import { useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { Switch } from "../../../components/ui/Switch";
import { cn } from "../../../utils/cn";
import { formatTime, toInputTime } from "../../../utils/time";
import { notificationsApi } from "../api";
import { describeDevice } from "../device";
import { currentSubscription, pushAvailability, subscribe, type PushAvailability } from "../push";
import type { NotificationPreferences } from "../types";
import styles from "./Notifications.module.css";

const LIMITATION: Record<Exclude<PushAvailability, "ready">, string> = {
  unsupported: "This browser can't show push reminders. Try Chrome, Edge or Firefox — or the installed app.",
  "ios-install-first": "On iPhone, reminders only work from the installed app: More → Install the app, then open it from your home screen and come back here.",
  "no-service-worker": "Reminders work in the installed app (or the deployed site), not the development server. Locally, run: npm run pwa:alt",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
};

type Status = "enabled" | "blocked" | "off" | "unavailable";
type TestResult = { ok: boolean; text: string } | null;

const STATUS_LABEL: Record<Status, string> = {
  enabled: "Enabled ✓",
  blocked: "Blocked ✕",
  off: "Not set up",
  unavailable: "Not available here",
};

type TimeKey = "tasks_time" | "habits_time" | "night_review_time" | "goal_deadlines_time";
type ToggleKey = "schedule_reminders" | "wake_up" | "tasks" | "habits" | "night_review" | "goal_deadlines";

export function NotificationSettings() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const config = useQuery({ queryKey: queryKeys.pushConfig, queryFn: notificationsApi.config });
  const prefs = useQuery({ queryKey: queryKeys.notificationPreferences, queryFn: notificationsApi.preferences });

  // Check now, and again whenever you come back (e.g. after changing browser settings).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const state = await pushAvailability();
      const sub = state === "ready" ? await currentSubscription() : null;
      if (!cancelled) {
        setAvailability(state);
        setSubscribed(Boolean(sub));
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void check();
    void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const update = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onMutate: async (patch) => {
      const previous = queryClient.getQueryData<NotificationPreferences>(queryKeys.notificationPreferences);
      queryClient.setQueryData<NotificationPreferences>(queryKeys.notificationPreferences, (p) => (p ? { ...p, ...patch } : p));
      return { previous };
    },
    onError: (error, _patch, context) => {
      queryClient.setQueryData(queryKeys.notificationPreferences, context?.previous);
      toast(toApiError(error).message, "error");
    },
    onSuccess: (data) => queryClient.setQueryData(queryKeys.notificationPreferences, data),
  });

  async function turnOn() {
    if (!config.data?.public_key) return;
    setBusy(true);
    try {
      const sub = await subscribe(config.data.public_key);
      await notificationsApi.subscribe(sub.toJSON());
      setSubscribed(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pushConfig });
      toast("Reminders are on for this device ✓");
    } catch (error) {
      toast(error instanceof Error && !("status" in error) ? error.message : toApiError(error).message, "error");
      setAvailability(await pushAvailability());
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await notificationsApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pushConfig });
      toast("Reminders are off for this device");
    } catch (error) {
      toast(toApiError(error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  /** Never claims success unless this very device was reached. */
  async function sendTest() {
    setTestResult(null);
    if ("Notification" in window && Notification.permission === "denied") {
      setAvailability("blocked");
      return setTestResult({ ok: false, text: "Notifications are blocked. Open your browser settings to allow them for this site." });
    }
    const sub = subscribed ? await currentSubscription() : null;
    if (!sub) return setTestResult({ ok: false, text: "Turn reminders on for this device first, then send a test." });
    setBusy(true);
    try {
      const { this_device } = await notificationsApi.test(sub.endpoint);
      setTestResult(
        this_device
          ? { ok: true, text: "Test notification sent ✓ It should appear in a few seconds." }
          : { ok: false, text: "This device didn't receive it. Turn reminders off and on again, then retry." },
      );
    } catch (error) {
      setTestResult({ ok: false, text: toApiError(error).message });
    } finally {
      setBusy(false);
    }
  }

  if (config.isLoading || prefs.isLoading || availability === null) return <p className={styles.hint}>Checking this device…</p>;
  if (config.data && !config.data.configured) {
    return <p className={styles.hint}>Reminders aren't set up on the server yet (missing VAPID keys).</p>;
  }

  const p = prefs.data;
  const status: Status =
    availability === "blocked" ? "blocked" : availability === "ready" ? (subscribed ? "enabled" : "off") : "unavailable";
  const otherDevices = Math.max(0, (config.data?.devices ?? 0) - (subscribed ? 1 : 0));
  const toggle = (key: ToggleKey, label: string, detail: string, timeKey?: TimeKey) =>
    p && (
      <li className={styles.row} key={key}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowDetail}>{detail}</span>
        </div>
        {timeKey && (
          <input
            type="time"
            className={styles.time}
            value={toInputTime(p[timeKey])}
            aria-label={`${label} time`}
            disabled={!p[key]}
            onChange={(e) => e.target.value && update.mutate({ [timeKey]: e.target.value })}
          />
        )}
        <Switch checked={p[key]} onChange={(checked) => update.mutate({ [key]: checked })} label={label} />
      </li>
    );

  return (
    <div className={styles.wrap}>
      <section className={styles.status} aria-label="Reminder status">
        <dl className={styles.statusList}>
          <div>
            <dt>Notifications</dt>
            <dd className={cn(styles.statusValue, styles[status])}>
              {STATUS_LABEL[status]}
            </dd>
          </div>
          <div>
            <dt>This device</dt>
            <dd>{describeDevice()}</dd>
          </div>
          {otherDevices > 0 && (
            <div>
              <dt>Other devices</dt>
              <dd>
                {otherDevices} more with reminders on
              </dd>
            </div>
          )}
        </dl>

        {status === "blocked" && <p className={styles.limitation}>{LIMITATION.blocked}</p>}
        {status === "unavailable" && availability !== "ready" && availability !== "blocked" && (
          <p className={styles.limitation}>{LIMITATION[availability]}</p>
        )}

        <div className={styles.deviceActions}>
          {status === "off" && (
            <Button icon={<BellRing size={18} aria-hidden />} onClick={() => void turnOn()} loading={busy}>
              Turn on reminders
            </Button>
          )}
          {status !== "unavailable" && (
            <Button variant="secondary" icon={<Send size={16} aria-hidden />} onClick={() => void sendTest()} loading={busy && status !== "off"}>
              Send test notification
            </Button>
          )}
          {status === "enabled" && (
            <Button variant="ghost" icon={<BellOff size={16} aria-hidden />} onClick={() => void turnOff()} disabled={busy}>
              Turn off
            </Button>
          )}
        </div>
        {testResult && (
          <p role="status" className={cn(styles.result, testResult.ok ? styles.resultOk : styles.resultBad)}>
            {testResult.text}
          </p>
        )}
      </section>

      {p && (
        <>
          <ul className={styles.list}>
            {toggle("schedule_reminders", "Schedule items", "When an item has a reminder set")}
            <li className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>Workouts</span>
                <span className={styles.rowDetail}>Before workout items, even without a reminder</span>
              </div>
              <select
                className={styles.time}
                value={p.workout_lead_minutes}
                disabled={!p.workout_reminder}
                aria-label="Minutes before a workout"
                onChange={(e) => update.mutate({ workout_lead_minutes: Number(e.target.value) })}
              >
                {[5, 10, 15, 30].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
              <Switch checked={p.workout_reminder} onChange={(c) => update.mutate({ workout_reminder: c })} label="Workouts" />
            </li>
            {toggle("wake_up", "Wake-up", `At ${formatTime(user.settings.wake_time)} (Settings → Discipline score)`)}
            {toggle("tasks", "Tasks left", "If important tasks are still open", "tasks_time")}
            {toggle("habits", "Habits left", "If habits are still due", "habits_time")}
            {toggle("night_review", "Night review", "If you haven't closed the day", "night_review_time")}
            {toggle("goal_deadlines", "Goal deadlines", "On the day before and the day of", "goal_deadlines_time")}
          </ul>
          <p className={styles.hint}>
            Reminders are sent by the server every minute. On a phone they arrive even when the app is closed; on a
            computer, while the browser is running.
          </p>
        </>
      )}
    </div>
  );
}
