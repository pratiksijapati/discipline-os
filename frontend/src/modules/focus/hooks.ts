import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { focusApi } from "./api";
import type { DailyFocusInput } from "./types";

/** The focus lives in the Today dashboard (and counts toward the score), so refresh that. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewCurrent }),
    ]);
}

export function useSetFocus() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: DailyFocusInput) => focusApi.create(input), onSuccess: refresh });
}

export function useUpdateFocus() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: DailyFocusInput }) => focusApi.update(id, input),
    onSuccess: refresh,
  });
}

export function useClearFocus() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: number) => focusApi.remove(id), onSuccess: refresh });
}
