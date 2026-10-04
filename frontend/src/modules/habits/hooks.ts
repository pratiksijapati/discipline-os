import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "../../api/errors";
import { queryKeys } from "../../api/queryKeys";
import { useToast } from "../../components/toast/useToast";
import type { TodayDashboard } from "../today/types";
import { habitsApi } from "./api";
import type { HabitCard, HabitInput } from "./types";

function invalidateHabits(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.habitsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useHabitsToday() {
  return useQuery({ queryKey: queryKeys.habitsToday, queryFn: habitsApi.today });
}

export function useHabitList(enabled = true) {
  return useQuery({ queryKey: queryKeys.habitsList, queryFn: habitsApi.list, enabled });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: habitsApi.create, onSuccess: () => invalidateHabits(queryClient) });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: HabitInput }) => habitsApi.update(id, input),
    onSuccess: () => invalidateHabits(queryClient),
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: habitsApi.remove, onSuccess: () => invalidateHabits(queryClient) });
}

function replaceCard(cards: HabitCard[] | undefined, card: HabitCard) {
  return cards?.map((c) => (c.id === card.id ? card : c));
}

/**
 * Logs a value. The server returns the recalculated card (streak, week strip),
 * which is written straight into both caches; the dashboard summary refreshes after.
 */
export function useLogHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) => habitsApi.log(id, value),
    onSuccess: (card, _vars) => {
      queryClient.setQueryData<{ date: string; habits: HabitCard[] }>(queryKeys.habitsToday, (data) =>
        data ? { ...data, habits: replaceCard(data.habits, card) ?? [] } : data,
      );
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard, (data) =>
        data ? { ...data, habits: replaceCard(data.habits, card) ?? [] } : data,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      if (card.completed) toast(card.streak && card.streak > 1 ? `${card.name} ✓ — ${card.streak} day streak` : `${card.name} ✓`);
    },
    onError: (error) => {
      toast(toApiError(error).message, "error");
      void invalidateHabits(queryClient);
    },
  });
}
