import type { ScheduleItem } from "../types";
import styles from "./Timeline.module.css";
import { TimelineItem } from "./TimelineItem";

interface TimelineProps {
  items: ScheduleItem[];
  currentId?: number | null;
  onToggle: (item: ScheduleItem) => void;
  onOpen: (item: ScheduleItem) => void;
  label: string;
}

export function Timeline({ items, currentId, onToggle, onOpen, label }: TimelineProps) {
  return (
    <ol className={styles.timeline} aria-label={label}>
      {items.map((item) => (
        <TimelineItem key={item.id} item={item} isCurrent={item.id === currentId} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </ol>
  );
}
