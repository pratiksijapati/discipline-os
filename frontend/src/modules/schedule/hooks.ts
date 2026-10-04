import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "../../api/errors";
import { queryKeys } from "../../api/queryKeys";
import { useToast } from "../../components/toast/useToast";
import type { TodayDashboard } from "../today/types";
import { scheduleApi, templateApi } from "./api";
import type { ScheduleItem, ScheduleItemInput, ScheduleStatus, ScheduleTemplateInput } from "./types";

function invalidatePlan(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.scheduleAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.templates }),
  ]);
}

export function useScheduleRange(start: string, end: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.schedule(start, end),
    queryFn: () => scheduleApi.list(start, end),
    enabled,
  });
}

export function useTemplates(enabled = true) {
  return useQuery({ queryKey: queryKeys.templates, queryFn: templateApi.list, enabled });
}

export function useCreateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: scheduleApi.create, onSuccess: () => invalidatePlan(queryClient) });
}

export function useUpdateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ScheduleItemInput }) => scheduleApi.update(id, input),
    onSuccess: () => invalidatePlan(queryClient),
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: scheduleApi.remove, onSuccess: () => invalidatePlan(queryClient) });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: templateApi.create, onSuccess: () => invalidatePlan(queryClient) });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ScheduleTemplateInput }) => templateApi.update(id, input),
    onSuccess: () => invalidatePlan(queryClient),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: templateApi.remove, onSuccess: () => invalidatePlan(queryClient) });
}

const STATUS_MESSAGES: Record<ScheduleStatus, string> = {
  completed: "Done ✓",
  in_progress: "Started — you've got this",
  skipped: "Skipped",
  upcoming: "Reopened",
};

function patchItem(item: ScheduleItem, id: number, status: ScheduleStatus): ScheduleItem {
  return item.id === id ? { ...item, status, display_status: status } : item;
}

/**
 * Changing status is the most frequent action in the app, so it updates the
 * screen immediately and rolls back if the server refuses.
 */
export function useSetItemStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ScheduleStatus }) => scheduleApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.scheduleAll }),
        queryClient.cancelQueries({ queryKey: queryKeys.dashboard }),
      ]);
      const previousLists = queryClient.getQueriesData<ScheduleItem[]>({ queryKey: queryKeys.scheduleAll });
      const previousDashboard = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard);

      queryClient.setQueriesData<ScheduleItem[]>({ queryKey: queryKeys.scheduleAll }, (list) =>
        list?.map((item) => patchItem(item, id, status)),
      );
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard, (data) =>
        data ? { ...data, schedule: data.schedule.map((item) => patchItem(item, id, status)) } : data,
      );
      return { previousLists, previousDashboard };
    },
    onError: (error, _vars, context) => {
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(queryKeys.dashboard, context?.previousDashboard);
      toast(toApiError(error).message, "error");
    },
    onSuccess: (_item, { status }) => toast(STATUS_MESSAGES[status]),
    onSettled: () => invalidatePlan(queryClient),
  });
}
