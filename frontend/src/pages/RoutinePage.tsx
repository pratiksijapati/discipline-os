import { ListOrdered } from "lucide-react";
import { toApiError } from "../api/errors";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { useToast } from "../components/toast/useToast";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { RoutineEditor } from "../modules/routine/components/RoutineEditor";
import { SUGGESTED_MORNING_ROUTINE } from "../modules/routine/constants";
import { useCreateRoutine, useRoutines } from "../modules/routine/hooks";

export function RoutinePage() {
  useDocumentTitle("Morning routine");
  const { data, isLoading, error, refetch } = useRoutines();
  const create = useCreateRoutine();
  const { toast } = useToast();

  async function start(withSuggestions: boolean) {
    try {
      await create.mutateAsync({
        name: "Morning routine",
        is_default: true,
        items: withSuggestions ? SUGGESTED_MORNING_ROUTINE.map((title) => ({ title })) : [],
      });
      toast("Morning routine ready ✓");
    } catch (err) {
      toast(toApiError(err).message, "error");
    }
  }

  const routine = data?.find((r) => r.is_default) ?? data?.[0];

  return (
    <>
      <PageHeader title="Morning routine" subtitle="Small steps that start your day — the same every morning." />
      {isLoading ? (
        <PageLoader />
      ) : error || !data ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : routine ? (
        <RoutineEditor key={routine.id} routine={routine} />
      ) : (
        <EmptyState
          icon={ListOrdered}
          title="No routine yet"
          description={`Start with the suggested routine (${SUGGESTED_MORNING_ROUTINE.join(" → ")}) and adjust it, or build your own.`}
          action={
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <Button onClick={() => void start(true)} loading={create.isPending}>
                Use suggested routine
              </Button>
              <Button variant="secondary" onClick={() => void start(false)} disabled={create.isPending}>
                Start empty
              </Button>
            </div>
          }
        />
      )}
    </>
  );
}
