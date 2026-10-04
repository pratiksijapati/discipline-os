import { Music, Pause, Play, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { cn } from "../../../utils/cn";
import { formatClock } from "../../../utils/duration";
import { MotionDetector, openFrontCamera, stopStream } from "../motion";
import { useBeat } from "../useBeat";
import { useWakeLock } from "../useWakeLock";
import styles from "./Wake.module.css";

const TICK_MS = 100;
/** Smoothed share of changed pixels above which you count as moving. */
const MOTION_THRESHOLD = 0.03;
/** Keep counting this long after the last detected movement (short pauses between moves). */
const GRACE_MS = 1500;

interface MovementChallengeProps {
  title: string;
  targetSeconds: number;
  mode: "camera" | "manual";
  onComplete: (activeSeconds: number) => void;
  onCameraUnavailable: (reason: string) => void;
  submitting: boolean;
}

/**
 * Camera mode: the countdown only runs while you're moving.
 * Manual mode: a plain countdown you can pause — the honest no-camera option.
 */
export function MovementChallenge({ title, targetSeconds, mode, onComplete, onCameraUnavailable, submitting }: MovementChallengeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(0);
  const doneRef = useRef(false);
  const [active, setActive] = useState(0);
  const [moving, setMoving] = useState(mode === "manual");
  const [level, setLevel] = useState(0);
  const [ready, setReady] = useState(mode === "manual");
  const [paused, setPaused] = useState(false);
  const [music, setMusic] = useState(false);

  useWakeLock(true);
  useBeat(music);

  const onCompleteRef = useRef(onComplete);
  const onUnavailableRef = useRef(onCameraUnavailable);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onUnavailableRef.current = onCameraUnavailable;
  });

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: MotionDetector | null = null;
    let timer: number | undefined;
    let cancelled = false;
    let ema = 0;
    let lastMotion = 0;
    let last = performance.now();

    function tick() {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      let isMoving: boolean;
      if (detector) {
        ema = ema * 0.6 + detector.sample() * 0.4;
        if (ema > MOTION_THRESHOLD) lastMotion = now;
        isMoving = now - lastMotion < GRACE_MS;
        setLevel(Math.min(1, ema / (MOTION_THRESHOLD * 4)));
      } else {
        isMoving = !pausedRef.current;
      }
      setMoving(isMoving);
      if (isMoving && !doneRef.current) {
        activeRef.current = Math.min(targetSeconds, activeRef.current + dt);
        setActive(activeRef.current);
        if (activeRef.current >= targetSeconds) {
          doneRef.current = true;
          window.clearInterval(timer);
          stopStream(stream);
          onCompleteRef.current(activeRef.current);
        }
      }
    }

    async function begin() {
      if (mode === "camera") {
        try {
          stream = await openFrontCamera();
          if (cancelled || !videoRef.current) return stopStream(stream);
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          detector = new MotionDetector(videoRef.current);
          setReady(true);
        } catch (error) {
          const reason =
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "Camera access was declined."
              : "The camera isn't available on this device.";
          onUnavailableRef.current(reason);
          return;
        }
      }
      last = performance.now();
      timer = window.setInterval(tick, TICK_MS);
    }

    void begin();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stopStream(stream);
    };
  }, [mode, targetSeconds]);

  const remaining = Math.max(0, Math.ceil(targetSeconds - active));
  const pct = (100 * active) / targetSeconds;
  const finished = remaining === 0;

  return (
    <div className={styles.challenge}>
      <p className={styles.kicker}>{title}</p>

      {mode === "camera" && (
        <div className={cn(styles.preview, moving && styles.previewMoving)}>
          <video ref={videoRef} playsInline muted aria-label="Camera preview (not recorded)" />
          {!ready && <span className={styles.previewHint}>Starting camera…</span>}
          <span className={styles.meter} aria-hidden>
            <span style={{ width: `${Math.round(level * 100)}%` }} />
          </span>
        </div>
      )}

      <ProgressRing value={pct} size={200} stroke={12} label={`${remaining} seconds remaining`}>
        <span className={styles.countdown}>{formatClock(remaining)}</span>
        <span className={styles.remainingLabel}>remaining</span>
      </ProgressRing>

      <p className={cn(styles.status, moving ? styles.statusGo : styles.statusStop)} role="status" aria-live="polite">
        {finished
          ? submitting
            ? "Saving…"
            : "Done!"
          : mode === "manual"
            ? paused
              ? "Paused"
              : "Keep going!"
            : !ready
              ? "Get in front of the camera"
              : moving
                ? "Keep moving!"
                : "Paused — move to continue"}
      </p>

      <div className={styles.controls}>
        <Button variant="secondary" icon={<Music size={18} aria-hidden />} aria-pressed={music} onClick={() => setMusic((m) => !m)}>
          {music ? "Stop beat" : "Play beat"}
        </Button>
        {mode === "manual" && !finished && (
          <Button
            variant="secondary"
            icon={paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
      </div>

      {mode === "camera" && (
        <p className={styles.privacy}>
          <VideoOff size={14} aria-hidden /> Movement is checked on this phone. Nothing is recorded or uploaded.
        </p>
      )}
    </div>
  );
}
