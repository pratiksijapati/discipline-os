import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { todayApi } from "./api";

export function useTodayDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: todayApi.get,
    // Keep NOW / NEXT current while the page stays open.
    refetchInterval: 60_000,
  });
}
