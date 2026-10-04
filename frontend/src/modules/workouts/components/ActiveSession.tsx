import { ChevronLeft, ChevronRight, Pause, Play, Plus, X } from "lucide-react";
import { useState } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Sheet } from "../../../components/ui/Sheet";
import { cn } from "../../../utils/cn";
import { formatClock } from "../../../utils/duration";
import { DEFAULT_REST_SECONDS, describeSet, describeTarget } from "../constants";
import { useAddSessionExercise, useAddSet, useDeleteSet, useExercises, useSessionAction } from "../hooks";
import type { SetInput, WorkoutSession } from "../types";
import { buzz, useCountdown, useElapsed } from "../useElapsed";
import styles from "./LiveSession.module.css";
import { SetEntry } from "./SetEntry";

function firstUnfinished(session: WorkoutSession): number {
  const index = session.exercises.findIndex((row) => row.sets.length < row.target_sets);
  return index === -1 ? Math.max(0, session.exercises.length - 1) : index;
}

interface ActiveSessionProps {
  session: WorkoutSession;
  receivedAt: number;
}

export function ActiveSession({ session, receivedAt }: ActiveSessionProps) {
  const { toast } = useToast();
  const elapsed = useElapsed(session, receivedAt);
  const action = useSessionAction(session.id);
  const addSet = useAddSet(session.id);
  const deleteSet = useDeleteSet(session.id);
  const addExercise = useAddSessionExercise(session.id);
  const exercises = useExercises();

  const [index, setIndex] = useState(() => firstUnfinished(session));
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const rest = useCountdown(restUntil, () => {
    buzz([150]);
    setRestUntil(null);
  });
  const [confirm, setConfirm] = useState<"finish" | "cancel" | null>(null);
  const [picking, setPicking] = useState(false);

  const rows = session.exercises;
  const row = rows[Math.min(index, rows.length - 1)];
  const paused = session.status === "paused";
  const doneCount = rows.filter((r) => r.sets.length >= r.target_sets).length;
  const withSets = rows.filter((r) => r.sets.length > 0).length;
  const setErrors = addSet.error ? toApiError(addSet.error).fieldErrors : {};

  function logSet(input: SetInput) {
    addSet.mutate(input, {
      onSuccess: (updated) => {
        const current = updated.exercises.find((r) => r.id === input.session_exercise);
        if (current && current.sets.length >= current.target_sets) {
          toast(`${current.exercise_name} done ✓`);
          const next = updated.exercises.findIndex((r) => r.sets.length < r.target_sets);
          if (next !== -1) setIndex(next);
          setRestUntil(null);
        } else {
          setRestUntil(Date.now() + DEFAULT_REST_SECONDS * 1000);
        }
      },
      onError: (error) => {
        if (Object.keys(toApiError(error).fieldErrors).length === 0) toast(toApiError(error).message, "error");
      },
    });
  }

  function run(kind: "pause" | "resume" | "complete" | "cancel") {
    action.mutate(kind, {
      onSuccess: () => setConfirm(null),
      onError: (error) => {
        setConfirm(null);
        toast(toApiError(error).message, "error");
      },
    });
  }

  function finish() {
    if (withSets === 0) return toast("Log at least one set first — or cancel the workout.", "error");
    if (withSets < rows.length) setConfirm("finish");
    else run("complete");
  }

  return (
    <div className={styles.live}>
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{paused ? "Paused" : "Workout in progress"}</p>
          <h1 className={styles.name}>{session.name}</h1>
        </div>
        <Button
          variant="secondary"
          icon={paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
          onClick={() => run(paused ? "resume" : "pause")}
          loading={action.isPending && (action.variables === "pause" || action.variables === "resume")}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
      </header>

      <div className={cn(styles.clock, paused && styles.clockPaused)} role="timer" aria-label="Workout time">
        {formatClock(elapsed)}
      </div>

      {rows.length > 0 && (
        <div className={styles.progress}>
          <ol className={styles.dots} aria-label="Exercises">
            {rows.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={cn(
                    styles.dotButton,
                    r.sets.length >= r.target_sets && styles.dotDone,
                    i === index && styles.dotCurrent,
                  )}
                  onClick={() => setIndex(i)}
                  aria-label={`${r.exercise_name}${r.sets.length >= r.target_sets ? " (done)" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                />
              </li>
            ))}
          </ol>
          <span className={styles.progressText}>
            {doneCount} / {rows.length} exercises
          </span>
        </div>
      )}

      {paused && (
        <div className={styles.pausedBanner}>
          <Pause size={18} aria-hidden /> Paused — the clock is stopped.
          <Button size="md" onClick={() => run("resume")}>
            Resume
          </Button>
        </div>
      )}

      {rest !== null && rest > 0 && (
        <div className={styles.rest} role="status">
          <span>
            Rest <strong>{formatClock(rest)}</strong>
          </span>
          <button type="button" onClick={() => setRestUntil(null)}>
            Skip
          </button>
        </div>
      )}

      {row ? (
        <section className={styles.exercise} aria-labelledby="exercise-name">
          <p className={styles.eyebrow}>
            Exercise {index + 1} of {rows.length}
          </p>
          <h2 id="exercise-name" className={styles.exerciseName}>
            {row.exercise_name}
          </h2>
          <p className={styles.target}>
            Target <strong>{describeTarget(row)}</strong>
          </p>
          {row.instructions && (
            <details className={styles.instructions}>
              <summary>How to do it</summary>
              <p>{row.instructions}</p>
            </details>
          )}

          {row.sets.length > 0 && (
            <ol className={styles.sets}>
              {row.sets.map((set) => (
                <li key={set.id} className={styles.set}>
                  <span className={styles.setCheck} aria-hidden>
                    ✓
                  </span>
                  <span className={styles.setNumber}>Set {set.set_number}</span>
                  <span className={styles.setValue}>{describeSet(set)}</span>
                  <button
                    type="button"
                    className={styles.setDelete}
                    onClick={() => deleteSet.mutate(set.id)}
                    aria-label={`Remove set ${set.set_number}`}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
          )}

          <SetEntry
            key={`${row.id}-${row.sets.length}`}
            row={row}
            onSubmit={logSet}
            busy={addSet.isPending}
            disabled={paused}
            errors={setErrors}
          />

          <div className={styles.nav}>
            <Button
              variant="ghost"
              icon={<ChevronLeft size={18} aria-hidden />}
              onClick={() => setIndex(index - 1)}
              disabled={index === 0}
            >
              Previous
            </Button>
            <Button variant="ghost" onClick={() => setIndex(index + 1)} disabled={index >= rows.length - 1}>
              Next <ChevronRight size={18} aria-hidden />
            </Button>
          </div>
        </section>
      ) : (
        <p className={styles.empty}>No exercises yet. Add one to start logging sets.</p>
      )}

      <Button variant="secondary" block icon={<Plus size={18} aria-hidden />} onClick={() => setPicking(true)}>
        Add exercise
      </Button>

      <div className={styles.footer}>
        <Button size="lg" block onClick={finish} loading={action.isPending && action.variables === "complete"}>
          Finish workout
        </Button>
        <Button variant="ghost" block onClick={() => setConfirm("cancel")}>
          Cancel workout
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "finish"}
        title="Finish workout?"
        message={`You've trained ${withSets} of ${rows.length} exercises. Finish anyway? Unfinished exercises won't count.`}
        confirmLabel="Finish"
        onConfirm={() => run("complete")}
        onCancel={() => setConfirm(null)}
        busy={action.isPending}
      />
      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel this workout?"
        message="It won't appear in your history or count toward your targets."
        confirmLabel="Cancel workout"
        onConfirm={() => run("cancel")}
        onCancel={() => setConfirm(null)}
        busy={action.isPending}
      />

      <Sheet open={picking} onClose={() => setPicking(false)} title="Add exercise">
        <ul className={styles.picker}>
          {(exercises.data ?? [])
            .filter((e) => e.is_active)
            .map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() =>
                    addExercise.mutate(exercise.id, {
                      onSuccess: (updated) => {
                        setPicking(false);
                        setIndex(updated.exercises.length - 1);
                      },
                    })
                  }
                  disabled={addExercise.isPending}
                >
                  {exercise.name}
                </button>
              </li>
            ))}
        </ul>
      </Sheet>
    </div>
  );
}
