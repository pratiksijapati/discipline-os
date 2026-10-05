import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { Button } from "../components/ui/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ScheduleForm, type ScheduleFormMode } from "../modules/schedule/components/ScheduleForm";
import { ScheduleItemDetails } from "../modules/schedule/components/ScheduleItemDetails";
import { TemplateList } from "../modules/schedule/components/TemplateList";
import { Timeline } from "../modules/schedule/components/Timeline";
import { useScheduleRange, useSetItemStatus } from "../modules/schedule/hooks";
import type { ScheduleItem } from "../modules/schedule/types";
import { addDays, formatDay, startOfWeek, todayIn } from "../utils/time";
import styles from "./pages.module.css";

type View = "today" | "tomorrow" | "week" | "routine";

const VIEW_OPTIONS: Array<{ value: View; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "Week" },
  { value: "routine", label: "Routine" },
];

type SheetState = { kind: "item"; item: ScheduleItem } | Exclude<ScheduleFormMode, { kind: "item" }> | null;

export function SchedulePage() {
  useDocumentTitle("My Day");
  const user = useCurrentUser();
  const weekStart = user.settings.week_start;
  const today = todayIn(user.timezone);
  const tomorrow = addDays(today, 1);

  const location = useLocation();
  // Links can open a specific view, e.g. { view: "tomorrow" }.
  const [view, setView] = useState<View>((location.state as { view?: View } | null)?.view ?? "today");
  const [sheet, setSheet] = useState<SheetState>(null);

  const [start, end] =
    view === "tomorrow"
      ? [tomorrow, tomorrow]
      : view === "week"
        ? [startOfWeek(today, weekStart), addDays(startOfWeek(today, weekStart), 6)]
        : [today, today];

  const { data, isLoading, error, refetch } = useScheduleRange(start, end, view !== "routine");
  const setStatus = useSetItemStatus();

  const toggle = (item: ScheduleItem) =>
    setStatus.mutate({ id: item.id, status: item.status === "completed" ? "upcoming" : "completed" });
  const openItem = (item: ScheduleItem) => setSheet({ kind: "item", item });
  const addDate = view === "tomorrow" ? tomorrow : today;

  function renderDays() {
    if (isLoading) return <PageLoader />;
    if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

    const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDays(start, i));
    if (view !== "week" && data.length === 0) {
      return (
        <EmptyState
          icon={CalendarPlus}
          title={view === "today" ? "Nothing planned today" : "Nothing planned tomorrow"}
          description="Add a one-off item, or build your routine so every day fills itself."
          action={<Button onClick={() => setSheet({ kind: "create", date: addDate })}>Add to schedule</Button>}
        />
      );
    }

    return days.map((day) => {
      const items = data.filter((item) => item.date === day);
      return (
        <section key={day} className={styles.dayGroup} aria-label={formatDay(day)}>
          {view === "week" && (
            <h2 className={styles.dayHeading}>
              {formatDay(day)}
              {day === today && <span>Today</span>}
            </h2>
          )}
          {items.length > 0 ? (
            <Timeline label={formatDay(day)} items={items} onToggle={toggle} onOpen={openItem} />
          ) : (
            <p className={styles.muted}>Nothing planned.</p>
          )}
        </section>
      );
    });
  }

  const sheetTitle =
    sheet?.kind === "item"
      ? sheet.item.title
      : sheet?.kind === "template"
        ? "Edit routine item"
        : "Add to schedule";

  return (
    <>
      <PageHeader title="My Day" subtitle="Your timeline and the routine that fills it." />
      <div className={styles.tabs}>
        <SegmentedControl legend="Schedule view" value={view} options={VIEW_OPTIONS} onChange={setView} />
      </div>

      {view === "routine" ? (
        <TemplateList
          onEdit={(template) => setSheet({ kind: "template", template })}
          onAdd={() => setSheet({ kind: "create", date: today })}
        />
      ) : (
        renderDays()
      )}

      <Fab label="Add to schedule" onClick={() => setSheet({ kind: "create", date: addDate })} />

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle}>
        {sheet?.kind === "item" ? (
          <ScheduleItemDetails item={sheet.item} weekStart={weekStart} onClose={() => setSheet(null)} />
        ) : sheet ? (
          <ScheduleForm mode={sheet} weekStart={weekStart} onSaved={() => setSheet(null)} />
        ) : null}
      </Sheet>
    </>
  );
}
