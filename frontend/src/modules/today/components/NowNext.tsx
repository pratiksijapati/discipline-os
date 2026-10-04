import { Check, Coffee, Play } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { formatRelativeMinutes, formatTime, formatTimeRange, minutesUntil } from "../../../utils/time";
import { CATEGORY_META } from "../../schedule/constants";
import type { ScheduleItem, ScheduleStatus } from "../../schedule/types";
import styles from "./NowNext.module.css";

interface NowNextProps {
  current: ScheduleItem | null;
  next: ScheduleItem | null;
  now: string;
  onStatus: (item: ScheduleItem, status: ScheduleStatus) => void;
  onOpen: (item: ScheduleItem) => void;
}

/** The most important card in the app: what to do right now, and what's after. */
export function NowNext({ current, next, now, onStatus, onOpen }: NowNextProps) {
  const CurrentIcon = current ? CATEGORY_META[current.category].icon : null;

  return (
    <section className={styles.card} aria-labelledby="now-heading">
      <p id="now-heading" className={styles.label}>
        Now
      </p>

      {current ? (
        <>
          <button type="button" className={styles.current} onClick={() => onOpen(current)}>
            <span className={styles.icon} aria-hidden>
              {CurrentIcon && <CurrentIcon size={24} />}
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
                <Button size="lg" icon={<Play size={20} aria-hidden />} onClick={() => onStatus(current, "in_progress")}>
                  Start
                </Button>
                <Button size="lg" variant="secondary" icon={<Check size={20} aria-hidden />} onClick={() => onStatus(current, "completed")}>
                  Done
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <div className={styles.free}>
          <Coffee size={22} aria-hidden />
          <div>
            <p className={styles.title}>Nothing scheduled right now</p>
            <p className={styles.time}>A good moment to finish a task.</p>
          </div>
        </div>
      )}

      {next && (
        <button type="button" className={styles.next} onClick={() => onOpen(next)}>
          <span className={styles.nextLabel}>Next</span>
          <span className={styles.nextTitle}>{next.title}</span>
          <span className={styles.nextTime}>
            {formatTime(next.start_time)} · {formatRelativeMinutes(minutesUntil(now, next.start_time))}
          </span>
        </button>
      )}
    </section>
  );
}
