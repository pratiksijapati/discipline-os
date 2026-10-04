import { ChevronRight, History as HistoryIcon } from "lucide-react";
import { Link } from "react-router";
import { LoadError } from "../../../components/LoadError";
import { PageLoader } from "../../../components/StatusScreen";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { formatMinutes } from "../../../utils/duration";
import { formatDay } from "../../../utils/time";
import { useWorkoutHistory } from "../hooks";
import styles from "./Workout.module.css";

export function HistoryList() {
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkoutHistory();

  if (isLoading) return <PageLoader />;
  if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

  const rows = data.pages.flatMap((page) => page.results);
  if (rows.length === 0) {
    return <EmptyState icon={HistoryIcon} title="No workouts yet" description="Finished workouts show up here with their sets." />;
  }

  return (
    <>
      <ul className={styles.historyList}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={`/workout/session/${row.id}`} className={styles.historyRow}>
              <span className={styles.historyText}>
                <span className={styles.planName}>{row.name}</span>
                <span className={styles.planMeta}>
                  {formatDay(row.date)} · {formatMinutes(row.duration_seconds)} · {row.exercise_count} exercises ·{" "}
                  {row.set_count} sets
                </span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button variant="secondary" block onClick={() => void fetchNextPage()} loading={isFetchingNextPage} style={{ marginTop: 12 }}>
          Load more
        </Button>
      )}
    </>
  );
}
