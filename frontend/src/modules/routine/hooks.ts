import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "../../api/errors";
import { queryKeys } from "../../api/queryKeys";
import { useToast } from "../../components/toast/useToast";
import type { TodayDashboard } from "../today/types";
import { routineApi } from "./api";
import type { RoutineStepInput, RoutineToday } from "./types";

function invalidateRoutine(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.routineToday }),
    queryClient.invalidateQueries({ queryKey: queryKeys.routines }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useRoutineToday() {
  return useQuery({ queryKey: queryKeys.routineToday, queryFn: routineApi.today });
}

export function useRoutines() {
  return useQuery({ queryKey: queryKeys.routines, queryFn: routineApi.list });
}

function withStep(data: RoutineToday, stepId: number, done: boolean): RoutineToday {
  const items = data.items.map((item) => (item.id === stepId ? { ...item, done } : item));
  return { ...data, items, completed: items.filter((item) => item.done).length };
}

/** Tick a step on/off instantly, rolling back if the server refuses. */
export function useCheckRoutineStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ stepId, done }: { stepId: number; done: boolean }) => routineApi.check(stepId, done),
    onMutate: async ({ stepId, done }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routineToday });
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard });
      const previousToday = queryClient.getQueryData<RoutineToday>(queryKeys.routineToday);
      const previousDashboard = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard);
      queryClient.setQueryData<RoutineToday>(queryKeys.routineToday, (d) => (d ? withStep(d, stepId, done) : d));
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard, (d) =>
        d ? { ...d, routine: withStep(d.routine, stepId, done) } : d,
      );
      return { previousToday, previousDashboard };
    },
    onSuccess: (data) => {
      if (data.total > 0 && data.completed === data.total) toast(`${data.routine?.name ?? "Routine"} complete 🔥`);
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(queryKeys.routineToday, context?.previousToday);
      queryClient.setQueryData(queryKeys.dashboard, context?.previousDashboard);
      toast(toApiError(error).message, "error");
    },
    onSettled: () => invalidateRoutine(queryClient),
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: routineApi.create, onSuccess: () => invalidateRoutine(queryClient) });
}

export function useRenameRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => routineApi.rename(id, name),
    onSuccess: () => invalidateRoutine(queryClient),
  });
}

export function useReorderRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemIds }: { id: number; itemIds: number[] }) => routineApi.reorder(id, itemIds),
    onSuccess: () => invalidateRoutine(queryClient),
  });
}

export function useAddRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ routineId, title }: { routineId: number; title: string }) => routineApi.addStep(routineId, title),
    onSuccess: () => invalidateRoutine(queryClient),
  });
}

export function useUpdateRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RoutineStepInput }) => routineApi.updateStep(id, input),
    onSuccess: () => invalidateRoutine(queryClient),
  });
}

export function useRemoveRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: routineApi.removeStep, onSuccess: () => invalidateRoutine(queryClient) });
}
