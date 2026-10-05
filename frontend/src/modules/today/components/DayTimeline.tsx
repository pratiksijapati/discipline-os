import { CheckButton } from "../../../components/ui/CheckButton";
import { cn } from "../../../utils/cn";
import { formatTime } from "../../../utils/time";
import type { ScheduleItem } from "../../schedule/types";
import styles from "./DayTimeline.module.css";

interface DayTimelineProps {
  items: ScheduleItem[];
  currentId: number | null;
  onToggle: (item: ScheduleItem) => void;
  onOpen: (item: ScheduleItem) => void;
}

/** Today's plan, one line per item: tick · time · title. Tap the line for details and actions. */
export function DayTimeline({ items, currentId, onToggle, onOpen }: DayTimelineProps) {
  return (
    <ol className={styles.list} aria-label="Today's plan">
      {items.map((item) => {
        const done = item.status === "completed";
        const isNow = item.id === currentId;
        const tag = isNow ? "Now" : item.display_status === "missed" ? "Missed" : item.display_status === "skipped" ? "Skipped" : null;

        return (
          <li key={item.id} className={cn(styles.row, styles[item.display_status], isNow && styles.now)}>
            <CheckButton
              checked={done}
              onToggle={() => onToggle(item)}
              label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
            />
            <button type="button" className={styles.main} onClick={() => onOpen(item)}>
              <span className={styles.time}>{formatTime(item.start_time)}</span>
              <span className={styles.title}>{item.title}</span>
              {tag && <span className={styles.tag}>{tag}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
