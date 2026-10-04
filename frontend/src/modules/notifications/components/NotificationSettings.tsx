import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, BellRing, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toApiError } from "../../../api/errors";
import { queryKeys } from "../../../api/queryKeys";
import { useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { Switch } from "../../../components/ui/Switch";
import { formatTime, toInputTime } from "../../../utils/time";
import { notificationsApi } from "../api";
import { currentSubscription, pushAvailability, subscribe, type PushAvailability } from "../push";
import type { NotificationPreferences } from "../types";
import styles from "./Notifications.module.css";

const LIMITATION: Record<Exclude<PushAvailability, "ready">, string> = {
  unsupported: "This browser can't show push reminders. Try Chrome, Edge or Firefox — or the installed app.",
  "ios-install-first": "On iPhone, reminders only work from the installed app: More → Install the app, then open it from your home screen and come back here.",
  "no-service-worker": "Reminders work in the installed app (or the deployed site), not the development server. Locally, run: npm run pwa:alt",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
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

  const config = useQuery({ queryKey: queryKeys.pushConfig, queryFn: notificationsApi.config });
  const prefs = useQuery({ queryKey: queryKeys.notificationPreferences, queryFn: notificationsApi.preferences });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await pushAvailability();
      const sub = state === "ready" ? await currentSubscription() : null;
      if (!cancelled) {
        setAvailability(state);
        setSubscribed(Boolean(sub));
      }
    })();
    return () => {
      cancelled = true;
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

  async function sendTest() {
    try {
      const { delivered } = await notificationsApi.test();
      toast(delivered ? `Test sent to ${delivered} device${delivered === 1 ? "" : "s"} ✓` : "No device received it — turn reminders on first.", delivered ? "success" : "error");
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  if (config.isLoading || prefs.isLoading || availability === null) return <p className={styles.hint}>Checking this device…</p>;
  if (config.data && !config.data.configured) {
    return <p className={styles.hint}>Reminders aren't set up on the server yet (missing VAPID keys).</p>;
  }

  const p = prefs.data;
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
      {availability !== "ready" ? (
        <p className={styles.limitation}>{LIMITATION[availability]}</p>
      ) : (
        <div className={styles.device}>
          <span className={styles.deviceText}>
            {subscribed ? <BellRing size={18} aria-hidden /> : <BellOff size={18} aria-hidden />}
            {subscribed ? "On for this device" : "Off for this device"}
          </span>
          {subscribed ? (
            <div className={styles.deviceActions}>
              <Button variant="secondary" icon={<Send size={16} aria-hidden />} onClick={() => void sendTest()}>
                Send test
              </Button>
              <Button variant="ghost" onClick={() => void turnOff()} loading={busy}>
                Turn off
              </Button>
            </div>
          ) : (
            <Button icon={<BellRing size={18} aria-hidden />} onClick={() => void turnOn()} loading={busy}>
              Turn on reminders
            </Button>
          )}
        </div>
      )}

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
