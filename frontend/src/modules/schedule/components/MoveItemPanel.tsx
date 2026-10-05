import { CalendarClock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toApiError } from "../../../api/errors";
import { useCurrentUser } from "../../../auth/useAuth";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/Field";
import { cn } from "../../../utils/cn";
import { addDays, formatDay, formatTime, minutesOf, nowTimeIn, todayIn } from "../../../utils/time";
import { useScheduleRange, useUpdateScheduleItem } from "../hooks";
import { laterTodayStart, moveInput, type MoveOption } from "../move";
import type { ScheduleItem } from "../types";
import styles from "./MoveItemPanel.module.css";

interface MoveItemPanelProps {
  item: ScheduleItem;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * "Move" for one item: later today, tomorrow, or any date and time.
 * Only this day's item moves — a repeating routine itself never changes.
 */
export function MoveItemPanel({ item, onDone, onCancel }: MoveItemPanelProps) {
  const user = useCurrentUser();
  const { toast } = useToast();
  const update = useUpdateScheduleItem();

  const today = todayIn(user.timezone);
  const now = nowTimeIn(user.timezone);
  const suggested = laterTodayStart(now);
  const tomorrow = addDays(today, 1);
  const sameTime = item.start_time.slice(0, 5);

  const [option, setOption] = useState<MoveOption>(suggested ? "later" : "tomorrow");
  const [laterTime, setLaterTime] = useState(suggested ?? "");
  const [customDate, setCustomDate] = useState(tomorrow);
  const [customTime, setCustomTime] = useState(sameTime);

  const target =
    option === "later"
      ? laterTime && minutesOf(laterTime) > minutesOf(now)
        ? { date: today, start: laterTime }
        : null
      : option === "tomorrow"
        ? { date: tomorrow, start: sameTime }
        : customDate && customTime
          ? { date: customDate, start: customTime }
          : null;

  const laterError = option === "later" && laterTime && !target ? "Pick a time later than now." : undefined;

  // Warn when the target day already has this routine's own item, so a second one is never a surprise.
  const targetDay = useScheduleRange(target?.date ?? today, target?.date ?? today, target !== null && item.template_id !== null);
  const twin =
    target && item.template_id !== null
      ? targetDay.data?.find((other) => other.template_id === item.template_id && other.id !== item.id && other.status !== "skipped")
      : undefined;

  async function move() {
    if (!target) return;
    try {
      await update.mutateAsync({ id: item.id, input: moveInput(item, target.date, target.start) });
      const when = target.date === today ? "later today" : target.date === tomorrow ? "tomorrow" : formatDay(target.date);
      toast(`Moved to ${when} at ${formatTime(target.start)} ✓`);
      onDone();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  return (
    <div className={styles.panel}>
      <p className={styles.heading}>
        <CalendarClock size={18} aria-hidden /> Move “{item.title}”
      </p>

      <div role="radiogroup" aria-label="When" className={styles.options}>
        {suggested && (
          <Option checked={option === "later"} onSelect={() => setOption("later")} title="Later today" sub="Pick a time">
            <TextField
              label="Time"
              type="time"
              value={laterTime}
              onChange={(e) => setLaterTime(e.target.value)}
              error={laterError}
            />
          </Option>
        )}
        <Option
          checked={option === "tomorrow"}
          onSelect={() => setOption("tomorrow")}
          title="Tomorrow"
          sub={`Same time · ${formatTime(sameTime)}`}
        />
        <Option checked={option === "custom"} onSelect={() => setOption("custom")} title="Choose date & time">
          <div className={styles.row}>
            <TextField label="Date" type="date" min={today} value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            <TextField label="Time" type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
          </div>
        </Option>
      </div>

      {twin && target ? (
        <p className={styles.warning} role="status">
          {target.date === tomorrow ? "Tomorrow" : formatDay(target.date)} already has “{twin.title}” at {formatTime(twin.start_time)} from your
          repeating plan. Moving adds a second one — if one is enough, skip today instead.
        </p>
      ) : (
        item.is_recurring && <p className={styles.note}>Only this day moves. Your repeating plan stays the same.</p>
      )}

      <div className={styles.actions}>
        <Button size="lg" onClick={() => void move()} disabled={!target} loading={update.isPending}>
          Move
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface OptionProps {
  checked: boolean;
  onSelect: () => void;
  title: string;
  sub?: string;
  children?: ReactNode;
}

function Option({ checked, onSelect, title, sub, children }: OptionProps) {
  return (
    <div className={cn(styles.option, checked && styles.checked)}>
      <button type="button" role="radio" aria-checked={checked} className={styles.optionButton} onClick={onSelect}>
        <span className={styles.radio} aria-hidden />
        <span className={styles.optionText}>
          <span className={styles.optionTitle}>{title}</span>
          {sub && <span className={styles.optionSub}>{sub}</span>}
        </span>
      </button>
      {checked && children && <div className={styles.optionBody}>{children}</div>}
    </div>
  );
}
