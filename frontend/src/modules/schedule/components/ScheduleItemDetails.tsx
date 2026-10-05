import { CalendarClock, Check, Pencil, Play, Repeat, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { useState } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import type { WeekStart } from "../../../types/auth";
import { formatDay, formatTimeRange } from "../../../utils/time";
import { STATUS_META } from "../constants";
import { useDeleteScheduleItem, useSetItemStatus } from "../hooks";
import type { ScheduleItem, ScheduleStatus } from "../types";
import { MoveItemPanel } from "./MoveItemPanel";
import { ScheduleForm } from "./ScheduleForm";
import styles from "./ScheduleForm.module.css";

export type ItemDetailsView = "actions" | "move" | "edit";

interface ScheduleItemDetailsProps {
  item: ScheduleItem;
  weekStart: WeekStart;
  onClose: () => void;
  /** Open straight into "move" (e.g. from the NOW card). */
  initialView?: ItemDetailsView;
}

/** Content of the sheet that opens when you tap a plan item: quick actions first, editing one tap away. */
export function ScheduleItemDetails({ item, weekStart, onClose, initialView = "actions" }: ScheduleItemDetailsProps) {
  const { toast } = useToast();
  const setStatus = useSetItemStatus();
  const remove = useDeleteScheduleItem();
  const [view, setView] = useState<ItemDetailsView>(initialView);

  const status = STATUS_META[item.display_status];
  const done = item.status === "completed";
  const missed = item.display_status === "missed";

  function changeStatus(next: ScheduleStatus) {
    setStatus.mutate({ id: item.id, status: next });
    onClose();
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(item.id);
      toast(item.is_recurring ? "Removed from this day" : "Deleted");
      onClose();
    } catch (error) {
      toast(toApiError(error).message, "error");
    }
  }

  if (view === "move") {
    return <MoveItemPanel item={item} onDone={onClose} onCancel={() => (initialView === "move" ? onClose() : setView("actions"))} />;
  }

  if (view === "edit") {
    return (
      <>
        {item.is_recurring && (
          <p className={styles.info}>
            <Repeat size={16} aria-hidden />
            Part of your repeating plan. Edits here change only this day.
          </p>
        )}
        <ScheduleForm mode={{ kind: "item", item }} weekStart={weekStart} onSaved={onClose} />
        <hr className={styles.divider} />
        <Button variant="danger" block icon={<Trash2 size={18} aria-hidden />} onClick={handleDelete} loading={remove.isPending}>
          {item.is_recurring ? "Remove from this day" : "Delete"}
        </Button>
      </>
    );
  }

  return (
    <>
      <p className={styles.summary}>
        <span>
          {formatDay(item.date, { weekday: "short", month: "short", day: "numeric" })} ·{" "}
          {formatTimeRange(item.start_time, item.end_time)}
        </span>
        {item.display_status !== "upcoming" && <Badge tone={status.tone}>{status.label}</Badge>}
        {item.is_recurring && <Repeat size={15} aria-label="Repeats" />}
      </p>

      <div className={styles.actions}>
        {done ? (
          <Button variant="secondary" icon={<RotateCcw size={18} aria-hidden />} onClick={() => changeStatus("upcoming")}>
            Reopen
          </Button>
        ) : (
          <>
            <Button icon={<Check size={18} aria-hidden />} onClick={() => changeStatus("completed")}>
              Done
            </Button>
            {item.status === "upcoming" && !missed && (
              <Button variant="secondary" icon={<Play size={18} aria-hidden />} onClick={() => changeStatus("in_progress")}>
                Start
              </Button>
            )}
            <Button variant="secondary" icon={<CalendarClock size={18} aria-hidden />} onClick={() => setView("move")}>
              Move
            </Button>
            {item.status === "skipped" ? (
              <Button variant="ghost" icon={<RotateCcw size={18} aria-hidden />} onClick={() => changeStatus("upcoming")}>
                Reopen
              </Button>
            ) : (
              <Button variant="ghost" icon={<SkipForward size={18} aria-hidden />} onClick={() => changeStatus("skipped")}>
                Skip
              </Button>
            )}
          </>
        )}
      </div>

      <Button variant="ghost" block icon={<Pencil size={18} aria-hidden />} onClick={() => setView("edit")}>
        Edit details
      </Button>
    </>
  );
}
