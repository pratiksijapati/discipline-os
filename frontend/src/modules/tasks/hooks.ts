import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "../../api/errors";
import { queryKeys } from "../../api/queryKeys";
import { useToast } from "../../components/toast/useToast";
import type { TodayDashboard } from "../today/types";
import { tasksApi } from "./api";
import type { Task, TaskInput, TaskStatus, TaskView } from "./types";

function invalidateTasks(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasksAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function useTasks(view: TaskView) {
  return useQuery({ queryKey: queryKeys.tasks(view), queryFn: () => tasksApi.list(view) });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: tasksApi.create, onSuccess: () => invalidateTasks(queryClient) });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskInput }) => tasksApi.update(id, input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: tasksApi.remove, onSuccess: () => invalidateTasks(queryClient) });
}

function patchTask(task: Task, id: number, status: TaskStatus): Task {
  return task.id === id ? { ...task, status, is_overdue: status === "completed" ? false : task.is_overdue } : task;
}

/** Instant check-off with rollback, like schedule items. */
export function useSetTaskStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => tasksApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.tasksAll }),
        queryClient.cancelQueries({ queryKey: queryKeys.dashboard }),
      ]);
      const previousLists = queryClient.getQueriesData<Task[]>({ queryKey: queryKeys.tasksAll });
      const previousDashboard = queryClient.getQueryData<TodayDashboard>(queryKeys.dashboard);

      queryClient.setQueriesData<Task[]>({ queryKey: queryKeys.tasksAll }, (list) =>
        list?.map((task) => patchTask(task, id, status)),
      );
      queryClient.setQueryData<TodayDashboard>(queryKeys.dashboard, (data) =>
        data ? { ...data, tasks: data.tasks.map((task) => patchTask(task, id, status)) } : data,
      );
      return { previousLists, previousDashboard };
    },
    onError: (error, _vars, context) => {
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      queryClient.setQueryData(queryKeys.dashboard, context?.previousDashboard);
      toast(toApiError(error).message, "error");
    },
    onSuccess: (_task, { status }) => toast(status === "completed" ? "Task completed ✓" : "Task reopened"),
    onSettled: () => invalidateTasks(queryClient),
  });
}
