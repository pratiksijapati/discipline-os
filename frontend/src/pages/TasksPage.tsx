import { ListTodo } from "lucide-react";
import { useState } from "react";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { TaskForm } from "../modules/tasks/components/TaskForm";
import { TaskList } from "../modules/tasks/components/TaskList";
import { TASK_VIEW_OPTIONS } from "../modules/tasks/constants";
import { useSetTaskStatus, useTasks } from "../modules/tasks/hooks";
import type { Task, TaskView } from "../modules/tasks/types";
import { todayIn } from "../utils/time";
import styles from "./pages.module.css";

const EMPTY_COPY: Record<TaskView, { title: string; description: string }> = {
  today: { title: "Nothing due today", description: "Add what you want to get done today." },
  upcoming: { title: "Nothing coming up", description: "Tasks with a future due date will show here." },
  someday: { title: "No someday tasks", description: "Ideas without a date live here until you're ready." },
  completed: { title: "Nothing completed yet", description: "Finished tasks show up here. Go get the first one." },
};

export function TasksPage() {
  useDocumentTitle("Tasks");
  const user = useCurrentUser();
  const today = todayIn(user.timezone);
  const [view, setView] = useState<TaskView>("today");
  const [sheet, setSheet] = useState<{ task?: Task } | null>(null);

  const { data, isLoading, error, refetch } = useTasks(view);
  const setStatus = useSetTaskStatus();
  const toggle = (task: Task) =>
    setStatus.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" });

  function renderList() {
    if (isLoading) return <PageLoader />;
    if (error || !data) return <LoadError error={error} onRetry={() => void refetch()} />;
    if (data.length === 0) return <EmptyState icon={ListTodo} {...EMPTY_COPY[view]} />;
    return <TaskList label={`${view} tasks`} tasks={data} today={today} onToggle={toggle} onOpen={(task) => setSheet({ task })} />;
  }

  return (
    <>
      <PageHeader title="Tasks" />
      <div className={styles.tabs}>
        <SegmentedControl legend="Task list" value={view} options={TASK_VIEW_OPTIONS} onChange={setView} />
      </div>
      {renderList()}

      <Fab label="Add task" onClick={() => setSheet({})} />
      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet?.task ? "Edit task" : "New task"}>
        <TaskForm
          task={sheet?.task}
          defaultDueDate={view === "someday" ? "" : today}
          onDone={() => setSheet(null)}
        />
      </Sheet>
    </>
  );
}
