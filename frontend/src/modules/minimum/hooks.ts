import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "../../api/errors";
import { queryKeys } from "../../api/queryKeys";
import { useToast } from "../../components/toast/useToast";
import type { TodayDashboard } from "../today/types";
import { minimumApi } from "./api";

/** The Minimum Day lives in the Today dashboard and changes the score, so refresh that. */
function refresh(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewCurrent }),
  ]);
}

export function useStartMinimumDay() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: minimumApi.start, onSuccess: () => refresh(queryClient) });
}

export function useStopMinimumDay() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: minimumApi.stop, onSuccess: () => refresh(queryClient) });
}

export function useSetMinimumChecklist() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: minimumApi.setChecklist, onSuccess: () => refresh(queryClient) });
}

/** Ticks a Minimum Day step, updating the card instantly and rolling back on error. */
export function useCheckMinimumStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ stepId, done }: { stepId: number; done: boolean }) => minimumApi.check(stepId, done),
    onMutate: async ({ stepId, done }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard });
      const previous = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard);
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard, (d) => {
        if (!d?.minimum_day) return d;
        const items = d.minimum_day.checklist.items.map((s) => (s.id === stepId ? { ...s, done } : s));
        const completed = items.filter((s) => s.done).length;
        return { ...d, minimum_day: { ...d.minimum_day, checklist: { ...d.minimum_day.checklist, items, completed } } };
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKeys.dashboard, context?.previous);
      toast(toApiError(error).message, "error");
    },
    onSettled: () => refresh(queryClient),
  });
}
