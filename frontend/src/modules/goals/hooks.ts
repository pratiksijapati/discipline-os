import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { goalsApi } from "./api";
import type { GoalInput, GoalListFilter, LogInput } from "./types";

function invalidateGoals(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.goalsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useGoals(status: GoalListFilter) {
  return useQuery({ queryKey: queryKeys.goals(status), queryFn: () => goalsApi.list(status) });
}

export function useGoalProgress(id: number) {
  return useQuery({ queryKey: queryKeys.goalProgress(id), queryFn: () => goalsApi.progress(id) });
}

export function useSaveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: GoalInput }) =>
      id ? goalsApi.update(id, input) : goalsApi.create(input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: goalsApi.remove, onSuccess: () => invalidateGoals(queryClient) });
}

export function useLogGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: LogInput }) => goalsApi.log(id, input),
    onSuccess: () => invalidateGoals(queryClient),
  });
}

export function useUndoGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: goalsApi.undo, onSuccess: () => invalidateGoals(queryClient) });
}

export function useToggleMainGoal() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: goalsApi.toggleMain, onSuccess: () => invalidateGoals(queryClient) });
}
