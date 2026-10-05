import { Dumbbell, ListChecks, ListOrdered, SquareCheckBig, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Sheet } from "../../../components/ui/Sheet";
import { formatProgress, quickStep } from "../../goals/constants";
import { useLogGoal } from "../../goals/hooks";
import { RoutineChecklist } from "../../routine/components/RoutineChecklist";
import { useStartWorkout } from "../../workouts/hooks";
import { isImportant, openTasks } from "../todayTasks";
import type { TodayDashboard } from "../types";
import styles from "./TodaySummaryList.module.css";

const MORNING_UNTIL_HOUR = 12;

/** Compact one-line summaries of everything that isn't the timeline. Details live one tap away. */
export function TodaySummaryList({ data }: { data: TodayDashboard }) {
  const hour = Number(data.now.slice(11, 13));
  const routine = data.routine;
  const routineOpen = routine.routine !== null && routine.completed < routine.total;
  // While the morning routine is unfinished in the morning, it's the first thing on the list.
  const routineFirst = routineOpen && hour < MORNING_UNTIL_HOUR;
  const routineRow = <RoutineRow key="routine" data={data} />;

  return (
    <section aria-labelledby="glance-heading">
      <h2 id="glance-heading" className="visually-hidden">
        Today at a glance
      </h2>
      <ul className={styles.list}>
        {routineFirst && routineRow}
        <HabitsRow data={data} />
        <TasksRow data={data} />
        <WorkoutRow data={data} />
        <GoalRow data={data} />
        {!routineFirst && routineRow}
      </ul>
    </section>
  );
}

function Row({ icon, title, detail, action }: { icon: ReactNode; title: string; detail: ReactNode; action?: ReactNode }) {
  return (
    <li className={styles.row}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.detail}>{detail}</span>
      </span>
      {action}
    </li>
  );
}

function RoutineRow({ data }: { data: TodayDashboard }) {
  const [open, setOpen] = useState(false);
  const { routine, completed, total } = data.routine;

  if (!routine) {
    return (
      <Row
        icon={<ListOrdered size={20} />}
        title="Morning routine"
        detail="Not set up yet"
        action={
          <Link to="/routine" className={styles.action}>
            Set up
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Row
        icon={<ListOrdered size={20} />}
        title={routine.name}
        detail={completed === total ? "Complete ✓" : `${completed} / ${total} done`}
        action={
          <button type="button" className={styles.action} onClick={() => setOpen(true)}>
            {completed === total ? "View" : "Tick off"}
          </button>
        }
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={routine.name}>
        <RoutineChecklist data={data.routine} />
      </Sheet>
    </>
  );
}

function HabitsRow({ data }: { data: TodayDashboard }) {
  const { completed, total } = data.summary.habits;
  if (total === 0) return null;
  return (
    <Row
      icon={<ListChecks size={20} />}
      title="Habits"
      detail={completed === total ? "All done ✓" : `${completed} / ${total} done`}
      action={
        <Link to="/habits" className={styles.action}>
          {completed === total ? "View" : "Log"}
        </Link>
      }
    />
  );
}

function TasksRow({ data }: { data: TodayDashboard }) {
  const open = openTasks(data.tasks, data.date);
  const important = open.filter(isImportant).length;
  const detail =
    important > 0
      ? `${important} important task${important === 1 ? "" : "s"} left`
      : open.length > 0
        ? `${open.length} task${open.length === 1 ? "" : "s"} left`
        : data.summary.tasks.total > 0
          ? "All done ✓"
          : "Nothing due today";

  return (
    <Row
      icon={<SquareCheckBig size={20} />}
      title="Tasks"
      detail={detail}
      action={
        <Link to="/tasks" className={styles.action}>
          View
        </Link>
      }
    />
  );
}

function WorkoutRow({ data }: { data: TodayDashboard }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const start = useStartWorkout();
  const { active, completed, planned } = data.workout;
  const plan = planned[0];

  if (active) {
    return (
      <Row
        icon={<Dumbbell size={20} />}
        title="Workout"
        detail={`${active.name} · ${active.status === "paused" ? "paused" : "in progress"}`}
        action={
          <Link to={`/workout/session/${active.id}`} className={styles.action}>
            Resume
          </Link>
        }
      />
    );
  }
  if (completed) {
    return (
      <Row
        icon={<Dumbbell size={20} />}
        title="Workout"
        detail={`${completed.name} · done ✓`}
        action={
          <Link to={`/workout/session/${completed.id}`} className={styles.action}>
            View
          </Link>
        }
      />
    );
  }
  if (!plan) return null;

  return (
    <Row
      icon={<Dumbbell size={20} />}
      title="Workout"
      detail={`Today: ${plan.name}`}
      action={
        <button
          type="button"
          className={styles.action}
          disabled={start.isPending}
          onClick={() =>
            start.mutate(plan.id, {
              onSuccess: (session) => navigate(`/workout/session/${session.id}`),
              onError: (error) => toast(toApiError(error).message, "error"),
            })
          }
        >
          Start
        </button>
      }
    />
  );
}

function GoalRow({ data }: { data: TodayDashboard }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const log = useLogGoal();
  const goal = data.main_goal;
  if (!goal) return null;

  const open = () => navigate("/growth", { state: { goalId: goal.id } });
  const step = goal.status === "completed" ? null : quickStep(goal);

  return (
    <Row
      icon={<Target size={20} />}
      title={goal.title}
      detail={formatProgress(goal)}
      action={
        <button
          type="button"
          className={styles.action}
          disabled={log.isPending}
          onClick={() => {
            if (!step) return open();
            log.mutate(
              { id: goal.id, input: { amount: step.amount, mode: step.mode } },
              {
                onSuccess: (updated) =>
                  toast(updated.status === "completed" ? `Goal achieved: ${updated.title} 🎉` : `${updated.title}: ${formatProgress(updated)}`),
                onError: (error) => toast(toApiError(error).message, "error"),
              },
            );
          }}
        >
          {step ? step.label : goal.status === "completed" ? "View" : "Log"}
        </button>
      }
    />
  );
}
