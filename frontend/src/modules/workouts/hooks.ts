import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import { exercisesApi, plansApi, sessionsApi, type SessionAction } from "./api";
import type { ExerciseInput, SetInput, WorkoutPlanInput, WorkoutSession } from "./types";

// ---------- library ----------

export function useExercises() {
  return useQuery({ queryKey: queryKeys.exercises, queryFn: exercisesApi.list });
}

export function useExerciseHistory(id: number) {
  return useQuery({ queryKey: queryKeys.exerciseHistory(id), queryFn: () => exercisesApi.history(id) });
}

export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans, queryFn: plansApi.list });
}

function invalidateLibrary(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.exercises }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plans }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useSaveExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ExerciseInput }) =>
      id ? exercisesApi.update(id, input) : exercisesApi.create(input),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: exercisesApi.remove, onSuccess: () => invalidateLibrary(queryClient) });
}

export function useSavePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: WorkoutPlanInput }) =>
      id ? plansApi.update(id, input) : plansApi.create(input),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: plansApi.remove, onSuccess: () => invalidateLibrary(queryClient) });
}

export function useStarterPlans() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: plansApi.starter, onSuccess: () => invalidateLibrary(queryClient) });
}

// ---------- sessions ----------

export function useActiveWorkout() {
  return useQuery({ queryKey: queryKeys.workoutActive, queryFn: sessionsApi.active });
}

export function useWorkoutStats() {
  return useQuery({ queryKey: queryKeys.workoutStats, queryFn: sessionsApi.stats });
}

export function useWorkoutSession(id: number) {
  return useQuery({ queryKey: queryKeys.workoutSession(id), queryFn: () => sessionsApi.get(id) });
}

export function useWorkoutHistory() {
  return useInfiniteQuery({
    queryKey: queryKeys.workoutHistory,
    queryFn: ({ pageParam }) => sessionsApi.history(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, _all, page) => (last.next ? page + 1 : undefined),
  });
}

/** Every session mutation returns the full session; store it and refresh summaries. */
function useSessionMutation<TVars>(fn: (vars: TVars) => Promise<WorkoutSession>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.workoutSession(session.id), session);
      queryClient.setQueryData(queryKeys.workoutActive, session.status === "in_progress" || session.status === "paused" ? session : null);
      if (session.status === "completed" || session.status === "cancelled") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.workoutStats });
        void queryClient.invalidateQueries({ queryKey: queryKeys.workoutHistory });
        void queryClient.invalidateQueries({ queryKey: queryKeys.exercises });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useStartWorkout() {
  return useSessionMutation((plan: number | null) => sessionsApi.start(plan));
}

export function useSessionAction(sessionId: number) {
  return useSessionMutation((action: SessionAction) => sessionsApi.action(sessionId, action));
}

export function useAddSet(sessionId: number) {
  return useSessionMutation((input: SetInput) => sessionsApi.addSet(sessionId, input));
}

export function useAddSessionExercise(sessionId: number) {
  return useSessionMutation((exercise: number) => sessionsApi.addExercise(sessionId, exercise));
}

export function useDeleteSet(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.deleteSet,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workoutSession(sessionId) }),
  });
}
