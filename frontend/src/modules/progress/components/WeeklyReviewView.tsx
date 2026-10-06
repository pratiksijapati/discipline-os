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
import type { WeeklyReview } from "../types";
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
        {Boolean(data.minimum_days) && (
          <p className={styles.heroSub}>
            Includes {data.minimum_days} minimum day{data.minimum_days === 1 ? "" : "s"}
          </p>
        )}
      </section>

      <InsightCard data={data} />

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

/** THIS WEEK: strongest area, what needs attention, one focus. Straight from the week's real data. */
function InsightCard({ data }: { data: WeeklyReview }) {
  const insight = data.insight;
  if (!insight) return null;
  const empty = !insight.strongest && !insight.needs_attention;

  return (
    <section className={cn(styles.card, styles.insight)} aria-labelledby="insight-heading">
      <h2 id="insight-heading" className={styles.insightLabel}>
        {data.is_current ? "This week" : "That week"}
      </h2>
      {empty ? (
        <p className={styles.muted}>Finish a few days to see what's working and what needs attention.</p>
      ) : (
        <dl className={styles.insightList}>
          {insight.strongest && (
            <div>
              <dt>
                <ThumbsUp size={16} aria-hidden /> Strongest area
              </dt>
              <dd>
                <strong>{insight.strongest.label}</strong> · {insight.strongest.detail}
              </dd>
            </div>
          )}
          {insight.needs_attention && (
            <div>
              <dt>
                <CircleAlert size={16} aria-hidden /> Needs attention
              </dt>
              <dd>
                <strong>{insight.needs_attention.label}</strong> · {insight.needs_attention.detail}
              </dd>
            </div>
          )}
          {insight.focus && (
            <div>
              <dt>
                <Sparkles size={16} aria-hidden /> Suggested focus{data.is_current && " next week"}
              </dt>
              <dd>
                <strong>{insight.focus}</strong>
                {insight.needs_attention && <span className={styles.insightHow}>{data.focus_next_week}</span>}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

