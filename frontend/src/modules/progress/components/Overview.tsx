import { ChartLine, Flame } from "lucide-react";
import { useState } from "react";
import { ColumnChart } from "../../../components/charts/ColumnChart";
import { DataTable } from "../../../components/charts/DataTable";
import { LineChart } from "../../../components/charts/LineChart";
import { LoadError } from "../../../components/LoadError";
import { StatTile } from "../../../components/StatTile";
import { PageLoader } from "../../../components/StatusScreen";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { cn } from "../../../utils/cn";
import { formatHours, formatMinutes } from "../../../utils/duration";
import { formatDay } from "../../../utils/time";
import { STREAK_LABELS } from "../../discipline/constants";
import type { Streaks } from "../../discipline/types";
import { useProgress } from "../hooks";
import type { ProgressRange } from "../types";
import styles from "./Progress.module.css";

const RANGE_OPTIONS: Array<{ value: ProgressRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "3 months" },
  { value: "365d", label: "Year" },
];

const pctText = (rate: number | null) => (rate === null ? "—" : `${rate}%`);

export function Overview() {
  const [range, setRange] = useState<ProgressRange>("30d");
  const { data, isLoading, error, refetch, isPlaceholderData } = useProgress(range);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

  const { score } = data;
  const nothingYet = score.days_scored === 0 && data.tasks.total === 0 && data.workouts.count === 0;
  const short = range === "7d" || range === "30d";
  const points = score.series.map((p) => ({
    key: p.date,
    label: formatDay(p.date, short ? { month: "short", day: "numeric" } : { month: "short" }),
    longLabel: formatDay(p.date, { weekday: "short", month: "short", day: "numeric" }),
    value: p.score,
    provisional: !p.is_final,
  }));
  const weeks = data.workouts.per_week.map((w) => ({
    key: w.week_start,
    label: formatDay(w.week_start, { month: "short", day: "numeric" }),
    value: w.count,
    tooltip: `Week of ${formatDay(w.week_start, { month: "short", day: "numeric" })}: ${w.count} workout${w.count === 1 ? "" : "s"}`,
  }));

  return (
    <div className={cn(styles.stack, isPlaceholderData && styles.refreshing)}>
      <div className={styles.filters}>
        <SegmentedControl legend="Time range" value={range} options={RANGE_OPTIONS} onChange={setRange} />
      </div>

      {nothingYet && (
        <EmptyState
          icon={ChartLine}
          title="Your progress starts here"
          description="Finish your first full day — the score, streaks and charts fill in from tomorrow."
        />
      )}

      <section className={styles.hero} aria-label="Average discipline score">
        <p className={styles.heroLabel}>Average discipline score</p>
        <p className={styles.heroValue}>{score.average ?? "—"}</p>
        <p className={styles.heroSub}>
          {score.best
            ? `Best ${score.best.score} on ${formatDay(score.best.date, { weekday: "short", month: "short", day: "numeric" })} · ${score.days_at_threshold} of ${score.days_scored} days at ${score.threshold}+`
            : "Finished days count here — today is still in progress."}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="trend-heading">
        <h2 id="trend-heading" className={styles.cardTitle}>
          Discipline score
        </h2>
        <p className={styles.cardSub}>Daily score · line marks your streak level ({score.threshold})</p>
        <LineChart
          points={points}
          reference={{ value: score.threshold, label: String(score.threshold) }}
          ariaLabel={`Discipline score per day, ${RANGE_OPTIONS.find((r) => r.value === range)?.label}`}
        />
        <DataTable
          caption="Discipline score per day"
          columns={["Day", "Score"]}
          rows={[...score.series].reverse().map((p) => [
            formatDay(p.date, { weekday: "short", month: "short", day: "numeric" }),
            p.score === null ? "—" : `${p.score}${p.is_final ? "" : " (today)"}`,
          ])}
        />
      </section>

      <dl className={styles.grid}>
        <StatTile
          label="Task completion"
          value={pctText(data.tasks.rate)}
          meter={data.tasks.rate}
          sub={`${data.tasks.completed} of ${data.tasks.total} tasks`}
        />
        <StatTile
          label="Wake-up success"
          value={pctText(data.wake_up.tracked_days ? Math.round((100 * data.wake_up.success_days) / data.wake_up.tracked_days) : null)}
          meter={data.wake_up.tracked_days ? (100 * data.wake_up.success_days) / data.wake_up.tracked_days : null}
          sub={`${data.wake_up.success_days} of ${data.wake_up.tracked_days} days on time`}
        />
        <StatTile
          label="Habit completion"
          value={pctText(data.habits.rate)}
          meter={data.habits.rate}
          sub={`${data.habits.success_days} days with every habit`}
        />
        <StatTile
          label="Morning routine"
          value={pctText(data.morning_routine.rate)}
          meter={data.morning_routine.rate}
          sub={`${data.morning_routine.success_days} full routines`}
        />
        <StatTile
          label="Night reviews"
          value={`${data.reflection.completed_days}/${data.reflection.days}`}
          meter={(100 * data.reflection.completed_days) / data.reflection.days}
          sub="days reviewed"
        />
        <StatTile label="Learning" value={formatHours(data.growth.learning_hours)} sub={`${data.growth.goals_completed} goals achieved`} />
      </dl>

      <section className={styles.card} aria-labelledby="workouts-heading">
        <h2 id="workouts-heading" className={styles.cardTitle}>
          Workouts per week
        </h2>
        <p className={styles.cardSub}>
          {data.workouts.count} workouts · {formatMinutes(data.workouts.minutes * 60)} · line is your target (
          {data.workouts.weekly_target})
        </p>
        <ColumnChart
          columns={weeks}
          target={{ value: data.workouts.weekly_target, label: String(data.workouts.weekly_target) }}
          ariaLabel="Workouts per week"
        />
        <DataTable
          caption="Workouts per week"
          columns={["Week of", "Workouts"]}
          rows={[...weeks].reverse().map((w) => [w.label, String(w.value)])}
        />
      </section>

      <StreakList streaks={data.streaks} />
    </div>
  );
}

function StreakList({ streaks }: { streaks: Streaks }) {
  return (
    <section className={styles.card} aria-labelledby="streaks-heading">
      <h2 id="streaks-heading" className={styles.cardTitle}>
        Streaks
      </h2>
      <dl className={styles.streaks}>
        {(Object.keys(STREAK_LABELS) as Array<keyof Streaks>).map((key) => {
          const s = streaks[key];
          return (
            <div key={key}>
              <dt>
                <Flame size={16} aria-hidden className={s.current ? styles.flameOn : styles.flameOff} />
                {STREAK_LABELS[key]}
              </dt>
              <dd>
                <strong>
                  {s.current} {s.unit === "weeks" ? "wk" : "d"}
                </strong>
                <span> best {s.best}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
