import { CalendarPlus, CheckCircle2, ListPlus, Moon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { SectionHeader } from "../components/SectionHeader";
import { PageLoader } from "../components/StatusScreen";
import { Button } from "../components/ui/Button";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ScheduleForm } from "../modules/schedule/components/ScheduleForm";
import { ScheduleItemDetails } from "../modules/schedule/components/ScheduleItemDetails";
import { Timeline } from "../modules/schedule/components/Timeline";
import { useScheduleRange, useSetItemStatus } from "../modules/schedule/hooks";
import type { ScheduleItem } from "../modules/schedule/types";
import { TaskForm } from "../modules/tasks/components/TaskForm";
import { useTasks } from "../modules/tasks/hooks";
import { addDays, formatDay, todayIn } from "../utils/time";
import styles from "./PrepareTomorrowPage.module.css";

const READY_KEY = "dos.preparedDay";

function readReady(): string | null {
  try {
    return localStorage.getItem(READY_KEY);
  } catch {
    return null;
  }
}

function saveReady(day: string) {
  try {
    localStorage.setItem(READY_KEY, day);
  } catch {
    // Private mode: the confirmation still shows for this visit.
  }
}

type SheetState = { kind: "item"; item: ScheduleItem } | { kind: "add" } | { kind: "task" } | null;

/**
 * The last step of the evening: look over the next day, adjust it, confirm it's ready.
 * Repeating items are already there; changes affect only that day.
 */
export function PrepareTomorrowPage() {
  const user = useCurrentUser();
  const location = useLocation();
  const today = todayIn(user.timezone);
  // The Night Review passes the day after the day it reviewed (that's "today" just after midnight).
  const day = (location.state as { day?: string } | null)?.day ?? addDays(today, 1);
  const label = day === today ? "today" : day === addDays(today, 1) ? "tomorrow" : formatDay(day);
  useDocumentTitle(`Prepare ${label}`);

  const plan = useScheduleRange(day, day);
  const tasks = useTasks(day === today ? "today" : "upcoming");
  const setStatus = useSetItemStatus();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [ready, setReady] = useState(() => readReady() === day);

  const dueTasks = (tasks.data ?? []).filter((t) => t.due_date === day && t.status !== "completed" && t.status !== "skipped");
  const header = <PageHeader eyebrow={formatDay(day)} title={`Prepare ${label}`} subtitle="A quick look so the morning starts simple." />;

  if (plan.isLoading) return (<>{header}<PageLoader /></>);
  if (plan.error || !plan.data) return (<>{header}<LoadError error={plan.error} onRetry={() => void plan.refetch()} /></>);

  if (ready) {
    return (
      <>
        {header}
        <div className={styles.ready}>
          <CheckCircle2 size={48} aria-hidden className={styles.readyIcon} />
          <p className={styles.readyTitle}>{label === "tomorrow" ? "Tomorrow" : "Your day"} is ready ✓</p>
          <p className={styles.readySub}>
            {plan.data.length} item{plan.data.length === 1 ? "" : "s"} planned
            {dueTasks.length > 0 && ` · ${dueTasks.length} task${dueTasks.length === 1 ? "" : "s"} due`}. Sleep well.
          </p>
          <Link to="/today" className="link-button">
            <Moon size={18} aria-hidden /> Done for today
          </Link>
          <button type="button" className={styles.textButton} onClick={() => setReady(false)}>
            Make another change
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className={styles.stack}>
        <section aria-labelledby="prep-plan">
          <SectionHeader id="prep-plan" title="Plan" />
          {plan.data.length > 0 ? (
            <>
              <Timeline
                label={`Plan for ${label}`}
                items={plan.data}
                onToggle={(item) => setStatus.mutate({ id: item.id, status: item.status === "completed" ? "upcoming" : "completed" })}
                onOpen={(item) => setSheet({ kind: "item", item })}
              />
              <p className={styles.hint}>Tap an item to change its time or remove it from {label}.</p>
            </>
          ) : (
            <p className={styles.empty}>Nothing planned yet.</p>
          )}
          <Button variant="secondary" block icon={<CalendarPlus size={18} aria-hidden />} onClick={() => setSheet({ kind: "add" })}>
            Add to {label}
          </Button>
        </section>

        <section aria-labelledby="prep-tasks">
          <SectionHeader id="prep-tasks" title="Tasks due" />
          {dueTasks.length > 0 ? (
            <ul className={styles.tasks}>
              {dueTasks.map((t) => (
                <li key={t.id}>
                  <span>{t.title}</span>
                  {(t.priority === "high" || t.priority === "critical") && <span className={styles.important}>Important</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No tasks due {label}.</p>
          )}
          <Button variant="secondary" block icon={<ListPlus size={18} aria-hidden />} onClick={() => setSheet({ kind: "task" })}>
            Add a task for {label}
          </Button>
        </section>

        <Button
          size="lg"
          block
          icon={<CheckCircle2 size={20} aria-hidden />}
          onClick={() => {
            saveReady(day);
            setReady(true);
          }}
        >
          {label === "tomorrow" ? "Tomorrow" : "My day"} is ready
        </Button>
      </div>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.kind === "item" ? sheet.item.title : sheet?.kind === "task" ? "New task" : `Add to ${label}`}
      >
        {sheet?.kind === "item" && (
          <ScheduleItemDetails item={sheet.item} weekStart={user.settings.week_start} initialView="edit" onClose={() => setSheet(null)} />
        )}
        {sheet?.kind === "add" && (
          <ScheduleForm mode={{ kind: "create", date: day }} weekStart={user.settings.week_start} onSaved={() => setSheet(null)} />
        )}
        {sheet?.kind === "task" && <TaskForm defaultDueDate={day} onDone={() => setSheet(null)} />}
      </Sheet>
    </>
  );
}
