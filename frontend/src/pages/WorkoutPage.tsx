import { ChevronRight, Dumbbell, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../api/errors";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { SectionHeader } from "../components/SectionHeader";
import { PageLoader } from "../components/StatusScreen";
import { useToast } from "../components/toast/useToast";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Fab } from "../components/ui/Fab";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Sheet } from "../components/ui/Sheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ExerciseForm } from "../modules/workouts/components/ExerciseForm";
import { HistoryList } from "../modules/workouts/components/HistoryList";
import { PlanCard } from "../modules/workouts/components/PlanCard";
import { PlanForm } from "../modules/workouts/components/PlanForm";
import { StatsCard } from "../modules/workouts/components/StatsCard";
import styles from "../modules/workouts/components/Workout.module.css";
import { describeTarget } from "../modules/workouts/constants";
import {
  useActiveWorkout,
  useExercises,
  usePlans,
  useStartWorkout,
  useStarterPlans,
  useWorkoutStats,
} from "../modules/workouts/hooks";
import type { Exercise, WorkoutPlan } from "../modules/workouts/types";
import { todayIn, weekdayOf } from "../utils/time";
import pageStyles from "./pages.module.css";

type Tab = "start" | "plans" | "exercises" | "history";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "start", label: "Start" },
  { value: "plans", label: "Plans" },
  { value: "exercises", label: "Exercises" },
  { value: "history", label: "History" },
];

type SheetState = { kind: "plan"; plan?: WorkoutPlan } | { kind: "exercise"; exercise?: Exercise } | null;

export function WorkoutPage() {
  useDocumentTitle("Workout");
  const user = useCurrentUser();
  const weekStart = user.settings.week_start;
  const todayWeekday = weekdayOf(todayIn(user.timezone));
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("start");
  const [sheet, setSheet] = useState<SheetState>(null);

  const active = useActiveWorkout();
  const stats = useWorkoutStats();
  const plans = usePlans();
  const exercises = useExercises();
  const start = useStartWorkout();
  const starter = useStarterPlans();

  function startPlan(plan: WorkoutPlan | null) {
    start.mutate(plan?.id ?? null, {
      onSuccess: (session) => navigate(`/workout/session/${session.id}`),
      onError: (error) => {
        toast(toApiError(error).message, "error");
        void active.refetch();
      },
    });
  }

  function addStarters() {
    starter.mutate(undefined, {
      onSuccess: () => toast("Starter plans added ✓"),
      onError: (error) => toast(toApiError(error).message, "error"),
    });
  }

  const activePlans = (plans.data ?? []).filter((p) => p.is_active);
  const todayPlans = activePlans.filter((p) => p.days_of_week.includes(todayWeekday));
  const otherPlans = activePlans.filter((p) => !p.days_of_week.includes(todayWeekday));
  const hasActive = Boolean(active.data);

  function planCards(list: WorkoutPlan[], highlight = false) {
    return (
      <ul className={styles.list}>
        {list.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            weekStart={weekStart}
            highlight={highlight}
            onEdit={(p) => setSheet({ kind: "plan", plan: p })}
            onStart={startPlan}
            starting={start.isPending && start.variables === plan.id}
            startDisabled={hasActive || start.isPending}
          />
        ))}
      </ul>
    );
  }

  function renderStart() {
    if (plans.isLoading) return <PageLoader />;
    if (plans.error) return <LoadError error={plans.error} onRetry={() => void plans.refetch()} />;
    return (
      <>
        {stats.data && <StatsCard stats={stats.data} />}
        {activePlans.length === 0 ? (
          <div className={styles.section} style={{ marginTop: 24 }}>
            <EmptyState
              icon={Dumbbell}
              title="No workout plan yet"
              description="Add ready-made plans (Push Day, Full Body) to start right away, or build your own."
              action={
                <div className={styles.quickRow}>
                  <Button icon={<Sparkles size={18} aria-hidden />} onClick={addStarters} loading={starter.isPending}>
                    Add starter plans
                  </Button>
                  <Button variant="secondary" onClick={() => setSheet({ kind: "plan" })}>
                    Create workout plan
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {todayPlans.length > 0 && (
              <section className={styles.section} style={{ marginTop: 24 }}>
                <SectionHeader title="Today's workout" />
                {planCards(todayPlans, true)}
              </section>
            )}
            <section className={styles.section} style={{ marginTop: 24 }}>
              <SectionHeader title={todayPlans.length ? "Other plans" : "Choose a workout"} />
              {otherPlans.length > 0 ? planCards(otherPlans) : <p className={pageStyles.muted}>No other plans.</p>}
            </section>
          </>
        )}
        <div className={styles.quickRow}>
          <Button
            variant="secondary"
            icon={<Play size={18} aria-hidden />}
            onClick={() => startPlan(null)}
            disabled={hasActive || start.isPending}
          >
            Quick start (empty workout)
          </Button>
        </div>
      </>
    );
  }

  function renderPlans() {
    if (plans.isLoading) return <PageLoader />;
    if (plans.error) return <LoadError error={plans.error} onRetry={() => void plans.refetch()} />;
    if (!plans.data?.length) {
      return (
        <EmptyState
          icon={Dumbbell}
          title="No workout plan yet"
          description="Create your first workout plan to get started."
          action={<Button onClick={() => setSheet({ kind: "plan" })}>Create workout plan</Button>}
        />
      );
    }
    return (
      <ul className={styles.list}>
        {plans.data.map((plan) => (
          <PlanCard key={plan.id} plan={plan} weekStart={weekStart} onEdit={(p) => setSheet({ kind: "plan", plan: p })} />
        ))}
      </ul>
    );
  }

  function renderExercises() {
    if (exercises.isLoading) return <PageLoader />;
    if (exercises.error) return <LoadError error={exercises.error} onRetry={() => void exercises.refetch()} />;
    if (!exercises.data?.length) {
      return (
        <EmptyState
          icon={Dumbbell}
          title="No exercises yet"
          description="Add your own, or add the starter plans to get common exercises."
          action={<Button onClick={addStarters}>Add starter exercises</Button>}
        />
      );
    }
    const sorted = [...exercises.data].sort((a, b) => Number(b.is_active) - Number(a.is_active));
    return (
      <ul className={styles.library}>
        {sorted.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" className={styles.libraryRow} onClick={() => setSheet({ kind: "exercise", exercise })}>
              <span className={styles.historyText}>
                <span className={styles.planName}>
                  {exercise.name}
                  {!exercise.is_active && " (archived)"}
                </span>
                <span className={styles.planMeta}>
                  {describeTarget({
                    measure: exercise.measure,
                    target_sets: exercise.default_sets,
                    target_reps: exercise.default_reps,
                    target_duration_seconds: exercise.default_duration_seconds,
                    target_weight_kg: exercise.default_weight_kg,
                  })}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const sheetTitle =
    sheet?.kind === "plan"
      ? sheet.plan
        ? "Edit plan"
        : "New workout plan"
      : sheet?.exercise
        ? sheet.exercise.name
        : "New exercise";

  return (
    <>
      <PageHeader title="Workout" />

      {active.data && (
        <div className={styles.activeBanner} role="status">
          <Dumbbell size={22} aria-hidden />
          <span>
            <strong>{active.data.name}</strong>
            <small>{active.data.status === "paused" ? "Paused" : "In progress"}</small>
          </span>
          <Link to={`/workout/session/${active.data.id}`} className="link-button">
            Resume
          </Link>
        </div>
      )}

      <div className={pageStyles.tabs}>
        <SegmentedControl legend="Workout section" value={tab} options={TABS} onChange={setTab} />
      </div>

      {tab === "start" && renderStart()}
      {tab === "plans" && renderPlans()}
      {tab === "exercises" && renderExercises()}
      {tab === "history" && <HistoryList />}

      {(tab === "plans" || tab === "exercises") && (
        <Fab
          label={tab === "plans" ? "New workout plan" : "New exercise"}
          onClick={() => setSheet(tab === "plans" ? { kind: "plan" } : { kind: "exercise" })}
        />
      )}

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheetTitle}>
        {sheet?.kind === "plan" && <PlanForm plan={sheet.plan} weekStart={weekStart} onDone={() => setSheet(null)} />}
        {sheet?.kind === "exercise" && <ExerciseForm exercise={sheet.exercise} onDone={() => setSheet(null)} />}
      </Sheet>
    </>
  );
}
