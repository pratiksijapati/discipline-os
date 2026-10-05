import { Check, Coffee, Dumbbell, Moon, Play, SquareCheckBig } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { formatRelativeMinutes, formatTime, formatTimeRange, minutesUntil } from "../../../utils/time";
import { CATEGORY_META } from "../../schedule/constants";
import type { ScheduleItem, ScheduleStatus } from "../../schedule/types";
import { useStartWorkout } from "../../workouts/hooks";
import { topTask } from "../todayTasks";
import type { TodayDashboard } from "../types";
import styles from "./NowNext.module.css";

const EVENING_HOUR = 18;

interface NowNextProps {
  data: TodayDashboard;
  onStatus: (item: ScheduleItem, status: ScheduleStatus) => void;
  onOpen: (item: ScheduleItem) => void;
  onMove: (item: ScheduleItem) => void;
}

/** The most important part of the app: what to do right now, then what comes next. */
export function NowNext({ data, onStatus, onOpen, onMove }: NowNextProps) {
  return (
    <>
      <section className={styles.card} aria-labelledby="now-heading">
        <p id="now-heading" className={styles.label}>
          Now
        </p>
        <NowBody data={data} onStatus={onStatus} onOpen={onOpen} onMove={onMove} />
      </section>
      <NextRow data={data} onOpen={onOpen} />
    </>
  );
}

function NowBody({ data, onStatus, onOpen, onMove }: NowNextProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const startWorkout = useStartWorkout();
  const { current, next, workout } = data;

  // A live workout beats everything: get back to it.
  if (workout.active) {
    return (
      <>
        <Headline icon={<Dumbbell size={24} />} title={workout.active.name} sub={workout.active.status === "paused" ? "Workout paused" : "Workout in progress"} />
        <Link to={`/workout/session/${workout.active.id}`} className={`link-button ${styles.bigLink}`}>
          <Play size={20} aria-hidden /> Resume workout
        </Link>
      </>
    );
  }

  if (current) {
    const Icon = CATEGORY_META[current.category].icon;
    const plan = workout.planned[0];
    const canStartWorkout = current.category === "workout" && !workout.completed && plan !== undefined;

    const begin = () => {
      if (!canStartWorkout) return onStatus(current, "in_progress");
      startWorkout.mutate(plan.id, {
        onSuccess: (session) => {
          if (current.status !== "in_progress") onStatus(current, "in_progress");
          navigate(`/workout/session/${session.id}`);
        },
        onError: (error) => toast(toApiError(error).message, "error"),
      });
    };

    return (
      <>
        <button type="button" className={styles.current} onClick={() => onOpen(current)}>
          <span className={styles.icon} aria-hidden>
            <Icon size={24} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{current.title}</span>
            <span className={styles.time}>{formatTimeRange(current.start_time, current.end_time)}</span>
          </span>
        </button>
        <div className={styles.actions}>
          {current.status === "in_progress" ? (
            <Button size="lg" block icon={<Check size={20} aria-hidden />} onClick={() => onStatus(current, "completed")}>
              Mark done
            </Button>
          ) : (
            <>
              <Button size="lg" icon={<Play size={20} aria-hidden />} loading={startWorkout.isPending} onClick={begin}>
                {canStartWorkout ? "Start workout" : "Start"}
              </Button>
              <Button size="lg" variant="secondary" icon={<Check size={20} aria-hidden />} onClick={() => onStatus(current, "completed")}>
                Done
              </Button>
            </>
          )}
        </div>
        <button type="button" className={styles.moveLink} onClick={() => onMove(current)}>
          Can't do it now? Move it
        </button>
      </>
    );
  }

  // Nothing scheduled right now.
  const task = topTask(data.tasks, data.date);
  const hour = Number(data.now.slice(11, 13));

  if (next) {
    return (
      <Headline
        icon={<Coffee size={24} />}
        title={`You're free until ${formatTime(next.start_time)}`}
        sub={task ? `Good time for: ${task.title}` : "A good moment to rest or get ahead."}
      />
    );
  }

  if (hour >= EVENING_HOUR && !data.reflection.completed) {
    return (
      <>
        <Headline icon={<Moon size={24} />} title="Close your day" sub="Two minutes of night review." />
        <Link to="/reflection" className={`link-button ${styles.bigLink}`}>
          Start night review
        </Link>
      </>
    );
  }

  if (task) {
    return (
      <>
        <Headline icon={<SquareCheckBig size={24} />} title={task.title} sub="Nothing else is scheduled — this task is next." />
        <Link to="/tasks" className={`link-button ${styles.bigLink}`}>
          Open tasks
        </Link>
      </>
    );
  }

  if (data.reflection.completed) {
    return (
      <>
        <Headline icon={<Moon size={24} />} title="Day complete ✓" sub="Set tomorrow up, then rest well." />
        <Link to="/tomorrow" className={`link-button ${styles.bigLink}`}>
          Prepare tomorrow
        </Link>
      </>
    );
  }

  return <Headline icon={<Coffee size={24} />} title="Nothing else planned today" sub="Enjoy the time — or plan tomorrow." />;
}

function Headline({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className={styles.current}>
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.time}>{sub}</span>
      </span>
    </div>
  );
}

/** One line: the next scheduled item, or the next task due today. */
function NextRow({ data, onOpen }: Pick<NowNextProps, "data" | "onOpen">) {
  const { next } = data;

  if (next) {
    return (
      <button type="button" className={styles.next} onClick={() => onOpen(next)}>
        <span className={styles.nextLabel}>Next</span>
        <span className={styles.nextTitle}>{next.title}</span>
        <span className={styles.nextTime}>
          {formatTime(next.start_time)} · {formatRelativeMinutes(minutesUntil(data.now, next.start_time))}
        </span>
      </button>
    );
  }

  // When NOW already shows the top task, don't repeat it here.
  const task = topTask(data.tasks, data.date);
  if (!task || !data.current) return null;
  return (
    <Link to="/tasks" className={styles.next}>
      <span className={styles.nextLabel}>Next</span>
      <span className={styles.nextTitle}>{task.title}</span>
      <span className={styles.nextTime}>{task.due_date === data.date ? "Due today" : "Overdue"}</span>
    </Link>
  );
}
