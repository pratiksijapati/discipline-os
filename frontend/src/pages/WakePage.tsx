import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, Flame, Sun, Timer, Video } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toApiError } from "../api/errors";
import { useCurrentUser } from "../auth/useAuth";
import { queryKeys } from "../api/queryKeys";
import { LoadError } from "../components/LoadError";
import { FullScreenLoader } from "../components/StatusScreen";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/FormAlert";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { greeting } from "../utils/date";
import { formatTime } from "../utils/time";
import { wakeApi } from "../modules/wake/api";
import { MathChallenge } from "../modules/wake/components/MathChallenge";
import { MovementChallenge } from "../modules/wake/components/MovementChallenge";
import styles from "../modules/wake/components/Wake.module.css";
import { CHALLENGE_LABEL } from "../modules/wake/constants";
import type { CompletedSession, WakeSession } from "../modules/wake/types";

type Phase = { kind: "intro" } | { kind: "running"; session: WakeSession } | { kind: "done"; streak: number };

const WAKE_KEY = ["wake", "today"] as const;

export function WakePage() {
  const user = useCurrentUser();
  const hello = greeting(user.timezone);
  useDocumentTitle(hello);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = useQuery({ queryKey: WAKE_KEY, queryFn: wakeApi.today });
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: ({ method }: { method: "camera" | "manual" | "math" }) => wakeApi.start(method),
    onSuccess: (session) => {
      setError(null);
      setPhase({ kind: "running", session });
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const finish = useMutation({
    mutationFn: ({ id, input }: { id: number; input: { active_seconds?: number; answers?: number[] } }) =>
      wakeApi.complete(id, input),
    onSuccess: (result: CompletedSession) => {
      setError(null);
      setPhase({ kind: "done", streak: result.streak.current });
      void queryClient.invalidateQueries({ queryKey: WAKE_KEY });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: queryKeys.routineToday });
    },
    onError: (err) => {
      const apiError = toApiError(err);
      setError(apiError.fieldErrors.answers?.[0] ?? apiError.message);
    },
  });

  if (today.isLoading) return <FullScreenLoader />;
  if (today.error || !today.data) {
    return (
      <div className={styles.page}>
        <LoadError error={today.error} onRetry={() => void today.refetch()} />
      </div>
    );
  }

  const { challenge, completed, streak } = today.data;
  const label = CHALLENGE_LABEL[challenge.type];
  const isMath = challenge.type === "math";
  const nowTime = today.data.now.slice(11, 16);

  // Already done this morning (or done just now).
  if (phase.kind === "done" || (phase.kind === "intro" && completed)) {
    const days = phase.kind === "done" ? phase.streak : streak.current;
    return (
      <div className={styles.page}>
        <div className={styles.done}>
          <span className={styles.doneIcon} aria-hidden>
            🎉
          </span>
          <h1 className={styles.doneTitle}>Challenge complete</h1>
          {days > 0 ? (
            <p className={styles.streakLine}>
              <Flame size={22} aria-hidden /> Wake-up streak: <strong>{days} day{days === 1 ? "" : "s"}</strong>
            </p>
          ) : (
            <p className={styles.subtle}>
              You're up and moving. Finish by {formatTime(today.data.deadline)} tomorrow to start a wake-up streak.
            </p>
          )}
          <Button size="lg" block onClick={() => navigate("/today")}>
            Start my day
          </Button>
          <Link to="/routine" className={styles.subtle}>
            See my morning routine
          </Link>
        </div>
      </div>
    );
  }

  if (phase.kind === "running") {
    const { session } = phase;
    return (
      <div className={styles.page}>
        <FormAlert message={error} />
        {session.method === "math" ? (
          <MathChallenge
            problems={session.problems}
            submitting={finish.isPending}
            error={null}
            onSubmit={(answers) => finish.mutate({ id: session.id, input: { answers } })}
          />
        ) : (
          <MovementChallenge
            key={session.id}
            title={label.title}
            targetSeconds={session.target_seconds}
            mode={session.method === "camera" ? "camera" : "manual"}
            submitting={finish.isPending}
            onComplete={(activeSeconds) =>
              finish.mutate({ id: session.id, input: { active_seconds: Math.round(activeSeconds) } })
            }
            onCameraUnavailable={(reason) => {
              setNotice(`${reason} You can do the challenge with a timer instead.`);
              setPhase({ kind: "intro" });
            }}
          />
        )}
        <button type="button" className={styles.subtle} onClick={() => setPhase({ kind: "intro" })}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <Sun size={40} aria-hidden className={styles.sun} />
        <h1 className={styles.hello}>{hello.toUpperCase()}</h1>
        <p className={styles.clock}>{formatTime(nowTime)}</p>
        <p className={styles.rule}>You can't complete your wake-up routine until you finish the challenge.</p>

        <div className={styles.card}>
          <p className={styles.cardLabel}>Challenge</p>
          <p className={styles.cardTitle}>
            {isMath ? "Solve 3 quick problems" : `${label.verb} for ${challenge.seconds} seconds`}
          </p>
          {!isMath && <p className={styles.cardHint}>The timer only runs while you're moving.</p>}
        </div>

        <FormAlert message={notice ?? error} />

        {isMath ? (
          <Button size="lg" block icon={<Brain size={20} aria-hidden />} onClick={() => start.mutate({ method: "math" })} loading={start.isPending}>
            Start challenge
          </Button>
        ) : (
          <>
            <Button size="lg" block icon={<Video size={20} aria-hidden />} onClick={() => start.mutate({ method: "camera" })} loading={start.isPending && start.variables?.method === "camera"}>
              Start challenge
            </Button>
            <Button variant="secondary" block icon={<Timer size={18} aria-hidden />} onClick={() => start.mutate({ method: "manual" })} loading={start.isPending && start.variables?.method === "manual"}>
              No camera — use a timer
            </Button>
          </>
        )}

        <p className={styles.meta}>
          Wake-up time {formatTime(today.data.wake_time)} · on time until {formatTime(today.data.deadline)}
          {streak.current > 0 && ` · 🔥 ${streak.current} day streak`}
        </p>
        <Link to="/today" className={styles.subtle}>
          Not now
        </Link>
      </div>
    </div>
  );
}
