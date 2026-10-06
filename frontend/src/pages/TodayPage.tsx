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
import { FocusCard } from "../modules/focus/components/FocusCard";
import { MinimumDay } from "../modules/minimum/components/MinimumDay";
import { ScheduleItemDetails, type ItemDetailsView } from "../modules/schedule/components/ScheduleItemDetails";
import { useSetItemStatus } from "../modules/schedule/hooks";
import type { ScheduleItem } from "../modules/schedule/types";
import { QuickAddSheet } from "../modules/quickadd/components/QuickAddSheet";
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

  const [opened, setOpened] = useState<{ item: ScheduleItem; view: ItemDetailsView } | null>(null);
  const openItem = (item: ScheduleItem) => setOpened({ item, view: "actions" });
  const [adding, setAdding] = useState(false);

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

        <NowNext
          data={data}
          onStatus={(item, status) => setItemStatus.mutate({ id: item.id, status })}
          onOpen={openItem}
          onMove={(item) => setOpened({ item, view: "move" })}
        />

        <FocusCard focus={data.focus} />

        {data.minimum_day?.active && <MinimumDay state={data.minimum_day} />}

        <ReviewCard data={data} />

        <section aria-labelledby="plan-heading">
          <SectionHeader id="plan-heading" title="Today's plan" action={<Link to="/schedule">Edit</Link>} />
          {data.schedule.length > 0 ? (
            <DayTimeline items={data.schedule} currentId={data.current?.id ?? null} onToggle={toggleItem} onOpen={openItem} />
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

        {data.minimum_day && !data.minimum_day.active && <MinimumDay state={data.minimum_day} />}
      </div>

      <Fab label="Add something" onClick={() => setAdding(true)} />

      <Sheet open={opened !== null} onClose={() => setOpened(null)} title={opened?.item.title ?? ""}>
        {opened && (
          <ScheduleItemDetails
            key={`${opened.item.id}-${opened.view}`}
            item={opened.item}
            weekStart={user.settings.week_start}
            initialView={opened.view}
            onClose={() => setOpened(null)}
          />
        )}
      </Sheet>

      <QuickAddSheet open={adding} onClose={() => setAdding(false)} date={data.date} weekStart={user.settings.week_start} />
    </>
  );
}
