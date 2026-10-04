import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { reflectionApi } from "./api";
import type { ReviewState } from "./types";

export function useCurrentReview() {
  return useQuery({ queryKey: queryKeys.reviewCurrent, queryFn: reflectionApi.current });
}

export function useReviewHistory() {
  return useInfiniteQuery({
    queryKey: queryKeys.reviewHistory,
    queryFn: ({ pageParam }) => reflectionApi.history(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, _all, page) => (last.next ? page + 1 : undefined),
  });
}

/** Autosave: keeps the cached review in sync but doesn't refetch on every keystroke. */
export function useSaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reflectionApi.save,
    onSuccess: (state) => queryClient.setQueryData<ReviewState>(queryKeys.reviewCurrent, state),
  });
}

export function useCompleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reflectionApi.complete,
    onSuccess: (state) => {
      queryClient.setQueryData<ReviewState>(queryKeys.reviewCurrent, state);
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviewHistory });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduleAll });
    },
  });
}
