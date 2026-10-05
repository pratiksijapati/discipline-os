import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { SectionHeader } from "../components/SectionHeader";
import { PageLoader } from "../components/StatusScreen";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ScoreChip } from "../modules/discipline/components/ScoreChip";
import { ScheduleItemDetails } from "../modules/schedule/components/ScheduleItemDetails";
import { useSetItemStatus } from "../modules/schedule/hooks";
import type { ScheduleItem } from "../modules/schedule/types";
import { TaskForm } from "../modules/tasks/components/TaskForm";
import { DayTimeline } from "../modules/today/components/DayTimeline";
import { NowNext } from "../modules/today/components/NowNext";
import { ReviewCard } from "../modules/today/components/ReviewCard";
import { TodaySummaryList } from "../modules/today/components/TodaySummaryList";
import { WakeCard } from "../modules/today/components/WakeCard";
import { useTodayDashboard } from "../modules/today/hooks";
import { formatLongDate, greeting } from "../utils/date";
import styles from "./pages.module.css";

/**
 * The screen used most of the day. Top to bottom it answers:
 * what should I do now → what's next → how is today going → everything else, one line each.
 */
export function TodayPage() {
  useDocumentTitle("Today");
  const user = useCurrentUser();
  const { data, isLoading, error, refetch } = useTodayDashboard();
  const setItemStatus = useSetItemStatus();

  const [openItem, setOpenItem] = useState<ScheduleItem | null>(null);
  const [addingTask, setAddingTask] = useState(false);

  const title = `${greeting(user.timezone)}, ${user.first_name}`;
  const eyebrow = formatLongDate(user.timezone);

  if (isLoading) return (<><PageHeader eyebrow={eyebrow} title={title} /><PageLoader /></>);
  if (error || !data) return (<><PageHeader eyebrow={eyebrow} title={title} /><LoadError error={error} onRetry={() => void refetch()} /></>);

  const toggleItem = (item: ScheduleItem) =>
    setItemStatus.mutate({ id: item.id, status: item.status === "completed" ? "upcoming" : "completed" });

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={<ScoreChip score={data.score} streaks={data.streaks} />} />
      <div className={styles.stack}>
        <WakeCard data={data} />

        <NowNext data={data} onStatus={(item, status) => setItemStatus.mutate({ id: item.id, status })} onOpen={setOpenItem} />

        <ReviewCard data={data} />

        <section aria-labelledby="plan-heading">
          <SectionHeader id="plan-heading" title="Today's plan" action={<Link to="/schedule">Edit</Link>} />
          {data.schedule.length > 0 ? (
            <DayTimeline items={data.schedule} currentId={data.current?.id ?? null} onToggle={toggleItem} onOpen={setOpenItem} />
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title="No plan for today"
              description="Add your routine once and every matching day fills itself."
              action={
                <Link to="/schedule" className={styles.linkButton}>
                  Plan my day
                </Link>
              }
            />
          )}
        </section>

        <TodaySummaryList data={data} />
      </div>

      <Fab label="Add task" onClick={() => setAddingTask(true)} />

      <Sheet open={openItem !== null} onClose={() => setOpenItem(null)} title={openItem?.title ?? ""}>
        {openItem && (
          <ScheduleItemDetails item={openItem} weekStart={user.settings.week_start} onClose={() => setOpenItem(null)} />
        )}
      </Sheet>

      <Sheet open={addingTask} onClose={() => setAddingTask(false)} title="New task">
        <TaskForm defaultDueDate={data.date} onDone={() => setAddingTask(false)} />
      </Sheet>
    </>
  );
}
