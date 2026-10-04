import { CircleAlert, Sparkles, Target, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { ColumnChart } from "../../../components/charts/ColumnChart";
import { DataTable } from "../../../components/charts/DataTable";
import { LoadError } from "../../../components/LoadError";
import { StatTile } from "../../../components/StatTile";
import { PageLoader } from "../../../components/StatusScreen";
import { Badge } from "../../../components/ui/Badge";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { cn } from "../../../utils/cn";
import { formatHours } from "../../../utils/duration";
import { formatDay } from "../../../utils/time";
import { RATING_TONE } from "../../discipline/constants";
import { useWeeklyReview } from "../hooks";
import styles from "./Progress.module.css";

const WEEK_OPTIONS = [
  { value: "0", label: "This week" },
  { value: "1", label: "Last week" },
];

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.bullets}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function WeeklyReviewView() {
  const [offset, setOffset] = useState("1");
  const { data, isLoading, error, refetch, isPlaceholderData } = useWeeklyReview(Number(offset));

  if (isLoading) return <PageLoader />;
  if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

  const range = `${formatDay(data.week_start, { month: "short", day: "numeric" })} – ${formatDay(data.week_end, { month: "short", day: "numeric" })}`;
  const days = data.score.days.map((d) => ({
    key: d.date,
    label: formatDay(d.date, { weekday: "short" }).slice(0, 2),
    value: d.score ?? 0,
    tooltip: `${formatDay(d.date, { weekday: "long" })}: ${d.score ?? "no score"}${d.is_final ? "" : " (in progress)"}`,
  }));

  return (
    <div className={cn(styles.stack, isPlaceholderData && styles.refreshing)}>
      <div className={styles.filters}>
        <SegmentedControl legend="Week" value={offset} options={WEEK_OPTIONS} onChange={setOffset} />
      </div>

      <section className={styles.hero} aria-label="Your week">
        <p className={styles.heroLabel}>Your week · {range}</p>
        <p className={styles.heroValue}>{data.score.average ?? "—"}</p>
        <p className={styles.heroSub}>
          {data.score.rating ? (
            <Badge tone={RATING_TONE[data.score.rating]}>{data.score.rating}</Badge>
          ) : data.is_current ? (
            "Finished days of this week will show here."
          ) : (
            "No scored days this week."
          )}
        </p>
      </section>

      <dl className={styles.grid}>
        <StatTile
          label="Wake-up"
          value={data.wake_up.tracked_days ? `${data.wake_up.success_days}/${data.wake_up.tracked_days}` : "—"}
          sub="days on time"
        />
        <StatTile label="Workouts" value={`${data.workouts.count}/${data.workouts.target}`} sub="vs weekly target" />
        <StatTile
          label="Tasks completed"
          value={data.tasks.total ? `${data.tasks.completed}/${data.tasks.total}` : "—"}
          meter={data.tasks.rate}
        />
        <StatTile label="Habit completion" value={data.habits.rate === null ? "—" : `${data.habits.rate}%`} meter={data.habits.rate} />
        <StatTile label="Learning" value={formatHours(data.learning_hours)} />
        <StatTile
          label="Best day"
          value={data.best_day ? formatDay(data.best_day.date, { weekday: "long" }) : "—"}
          sub={data.best_day ? `${data.best_day.score}` : undefined}
        />
      </dl>

      {days.length > 0 && (
        <section className={styles.card} aria-labelledby="week-days">
          <h2 id="week-days" className={styles.cardTitle}>
            Score by day
          </h2>
          <ColumnChart columns={days} max={100} ariaLabel="Discipline score by day this week" height={150} />
          <DataTable
            caption="Discipline score by day"
            columns={["Day", "Score"]}
            rows={data.score.days.map((d) => [formatDay(d.date, { weekday: "long" }), d.score === null ? "—" : String(d.score)])}
          />
        </section>
      )}

      {data.needs_attention && (
        <section className={cn(styles.card, styles.attention)} aria-labelledby="attention">
          <h2 id="attention" className={styles.cardTitle}>
            <CircleAlert size={18} aria-hidden /> Needs attention
          </h2>
          <p>
            <strong>{data.needs_attention.label}</strong> — averaged {data.needs_attention.rate}%
          </p>
        </section>
      )}

      <section className={styles.card} aria-labelledby="went-well">
        <h2 id="went-well" className={styles.cardTitle}>
          <ThumbsUp size={18} aria-hidden /> What went well
        </h2>
        <Bullets items={data.went_well} empty="Keep logging — wins show up here." />
      </section>

      <section className={styles.card} aria-labelledby="struggled">
        <h2 id="struggled" className={styles.cardTitle}>
          <Target size={18} aria-hidden /> Where I struggled
        </h2>
        <Bullets items={data.struggled} empty="Nothing stood out. Nice." />
      </section>

      <section className={cn(styles.card, styles.focus)} aria-labelledby="focus">
        <h2 id="focus" className={styles.cardTitle}>
          <Sparkles size={18} aria-hidden /> Focus for next week
        </h2>
        <p>{data.focus_next_week}</p>
      </section>

      {data.your_notes.length > 0 && (
        <section className={styles.card} aria-labelledby="notes">
          <h2 id="notes" className={styles.cardTitle}>
            Your own notes
          </h2>
          <Bullets items={data.your_notes} empty="" />
        </section>
      )}
    </div>
  );
}
