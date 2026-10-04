import { Repeat } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { CheckButton } from "../../../components/ui/CheckButton";
import { cn } from "../../../utils/cn";
import { formatTime, formatTimeRange } from "../../../utils/time";
import { CATEGORY_META, STATUS_META } from "../constants";
import type { ScheduleItem } from "../types";
import styles from "./Timeline.module.css";

interface TimelineItemProps {
  item: ScheduleItem;
  isCurrent?: boolean;
  onToggle: (item: ScheduleItem) => void;
  onOpen: (item: ScheduleItem) => void;
}

export function TimelineItem({ item, isCurrent, onToggle, onOpen }: TimelineItemProps) {
  const { icon: Icon, label: categoryLabel } = CATEGORY_META[item.category];
  const done = item.status === "completed";
  const status = STATUS_META[item.display_status];

  return (
    <li className={cn(styles.row, styles[item.display_status], isCurrent && styles.current)}>
      <span className={styles.time}>{formatTime(item.start_time)}</span>
      <span className={styles.rail} aria-hidden>
        <span className={styles.dot} />
      </span>
      <div className={styles.card}>
        <button type="button" className={styles.main} onClick={() => onOpen(item)}>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.meta}>
            <Icon size={14} aria-label={categoryLabel} />
            {formatTimeRange(item.start_time, item.end_time)}
            {item.is_recurring && <Repeat size={13} aria-label="Repeats" />}
          </span>
        </button>
        {item.display_status !== "upcoming" && <Badge tone={isCurrent ? "accent" : status.tone}>{isCurrent ? "Now" : status.label}</Badge>}
        <CheckButton
          checked={done}
          onToggle={() => onToggle(item)}
          label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
        />
      </div>
    </li>
  );
}
