import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { progressApi } from "./api";
import type { ProgressRange } from "./types";

/** Keeps the previous range on screen while the new one loads (no layout jump). */
export function useProgress(range: ProgressRange) {
  return useQuery({
    queryKey: queryKeys.progress(range),
    queryFn: () => progressApi.get(range),
    placeholderData: keepPreviousData,
  });
}

export function useWeeklyReview(offset: number) {
  return useQuery({
    queryKey: queryKeys.weekly(offset),
    queryFn: () => progressApi.weekly(offset),
    placeholderData: keepPreviousData,
  });
}
