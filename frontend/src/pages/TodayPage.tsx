import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { SectionHeader } from "../components/SectionHeader";
import { PageLoader } from "../components/StatusScreen";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { GoalCard } from "../modules/goals/components/GoalCard";
import { HabitCard } from "../modules/habits/components/HabitCard";
import habitStyles from "../modules/habits/components/HabitCard.module.css";
import { RoutineChecklist } from "../modules/routine/components/RoutineChecklist";
import { ScheduleItemDetails } from "../modules/schedule/components/ScheduleItemDetails";
import { Timeline } from "../modules/schedule/components/Timeline";
import { useSetItemStatus } from "../modules/schedule/hooks";
import type { ScheduleItem } from "../modules/schedule/types";
import { TaskForm } from "../modules/tasks/components/TaskForm";
import { TaskList } from "../modules/tasks/components/TaskList";
import { useSetTaskStatus } from "../modules/tasks/hooks";
import type { Task } from "../modules/tasks/types";
import { NowNext } from "../modules/today/components/NowNext";
import { ScoreCard } from "../modules/discipline/components/ScoreCard";
import { ReviewCard } from "../modules/today/components/ReviewCard";
import { WorkoutCard } from "../modules/today/components/WorkoutCard";
import { useTodayDashboard } from "../modules/today/hooks";
import { formatLongDate, greeting } from "../utils/date";
import styles from "./pages.module.css";

export function TodayPage() {
  useDocumentTitle("Today");
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useTodayDashboard();
  const setItemStatus = useSetItemStatus();
  const setTaskStatus = useSetTaskStatus();

  const [openItem, setOpenItem] = useState<ScheduleItem | null>(null);
  const [taskSheet, setTaskSheet] = useState<{ task?: Task } | null>(null);

  const header = (
    <PageHeader eyebrow={formatLongDate(user.timezone)} title={`${greeting(user.timezone)}, ${user.first_name}`} />
  );

  if (isLoading) return (<>{header}<PageLoader /></>);
  if (error || !data) return (<>{header}<LoadError error={error} onRetry={() => void refetch()} /></>);

  const toggleItem = (item: ScheduleItem) =>
    setItemStatus.mutate({ id: item.id, status: item.status === "completed" ? "upcoming" : "completed" });
  const toggleTask = (task: Task) =>
    setTaskStatus.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" });

  return (
    <>
      {header}
      <div className={styles.stack}>
        <ScoreCard score={data.score} streaks={data.streaks} summary={data.summary} />

        <ReviewCard data={data} />

        {data.schedule.length > 0 && (
          <NowNext
            current={data.current}
            next={data.next}
            now={data.now}
            onStatus={(item, status) => setItemStatus.mutate({ id: item.id, status })}
            onOpen={setOpenItem}
          />
        )}

        <section aria-labelledby="plan-heading">
          <SectionHeader id="plan-heading" title="Today's plan" action={<Link to="/schedule">Edit plan</Link>} />
          {data.schedule.length > 0 ? (
            <Timeline
              label="Today's plan"
              items={data.schedule}
              currentId={data.current?.id}
              onToggle={toggleItem}
              onOpen={setOpenItem}
            />
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title="No plan for today"
              description="Add your routine once — wake up, workout, study — and it fills every matching day automatically."
              action={
                <Link to="/schedule" className={styles.linkButton}>
                  Plan my day
                </Link>
              }
            />
          )}
        </section>

        {data.main_goal && (
          <GoalCard
            goal={data.main_goal}
            compact
            onOpen={(goal) => navigate("/growth", { state: { goalId: goal.id } })}
          />
        )}

        <WorkoutCard workout={data.workout} />

        <RoutineChecklist data={data.routine} />

        {data.habits.length > 0 && (
          <section aria-labelledby="habits-heading">
            <SectionHeader id="habits-heading" title="Habits" action={<Link to="/habits">All habits</Link>} />
            <ul className={habitStyles.list}>
              {data.habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  today={data.date}
                  showWeek={false}
                  onOpen={() => navigate("/habits")}
                />
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="tasks-heading">
          <SectionHeader id="tasks-heading" title="Tasks" action={<Link to="/tasks">All tasks</Link>} />
          {data.tasks.length > 0 ? (
            <TaskList
              label="Today's tasks"
              tasks={data.tasks}
              today={data.date}
              onToggle={toggleTask}
              onOpen={(task) => setTaskSheet({ task })}
            />
          ) : (
            <p className={styles.muted}>Nothing due today. Tap + to add a task.</p>
          )}
        </section>
      </div>

      <Fab label="Add task" onClick={() => setTaskSheet({})} />

      <Sheet open={openItem !== null} onClose={() => setOpenItem(null)} title={openItem?.title ?? ""}>
        {openItem && (
          <ScheduleItemDetails item={openItem} weekStart={user.settings.week_start} onClose={() => setOpenItem(null)} />
        )}
      </Sheet>

      <Sheet open={taskSheet !== null} onClose={() => setTaskSheet(null)} title={taskSheet?.task ? "Edit task" : "New task"}>
        <TaskForm task={taskSheet?.task} defaultDueDate={data.date} onDone={() => setTaskSheet(null)} />
      </Sheet>
    </>
  );
}
