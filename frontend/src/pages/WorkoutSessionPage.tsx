import { useParams } from "react-router";
import { LoadError } from "../components/LoadError";
import { PageLoader } from "../components/StatusScreen";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ActiveSession } from "../modules/workouts/components/ActiveSession";
import { SessionSummary } from "../modules/workouts/components/SessionSummary";
import { useWorkoutSession } from "../modules/workouts/hooks";

/** The live workout screen, or its summary once finished. */
export function WorkoutSessionPage() {
  const id = Number(useParams().id);
  const { data, isLoading, error, refetch, dataUpdatedAt } = useWorkoutSession(id);
  useDocumentTitle(data?.name ?? "Workout");

  if (isLoading) return <PageLoader />;
  if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;

  const live = data.status === "in_progress" || data.status === "paused";
  return live ? <ActiveSession session={data} receivedAt={dataUpdatedAt} /> : <SessionSummary session={data} />;
}
