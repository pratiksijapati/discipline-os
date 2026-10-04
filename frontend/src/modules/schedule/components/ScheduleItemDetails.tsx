import { Check, Play, Repeat, RotateCcw, SkipForward, Trash2 } from "lucide-react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import type { WeekStart } from "../../../types/auth";
import { useDeleteScheduleItem, useSetItemStatus } from "../hooks";
import type { ScheduleItem, ScheduleStatus } from "../types";
import { ScheduleForm } from "./ScheduleForm";
import styles from "./ScheduleForm.module.css";

interface ScheduleItemDetailsProps {
  item: ScheduleItem;
  weekStart: WeekStart;
  onClose: () => void;
}

/** Content of the sheet that opens when you tap a timeline item. */
export function ScheduleItemDetails({ item, weekStart, onClose }: ScheduleItemDetailsProps) {
  const { toast } = useToast();
  const setStatus = useSetItemStatus();
  const remove = useDeleteScheduleItem();
  const isClosed = item.status === "completed" || item.status === "skipped";

  function changeStatus(status: ScheduleStatus) {
    setStatus.mutate({ id: item.id, status });
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

  return (
    <>
      <div className={styles.actions}>
        {isClosed ? (
          <Button variant="secondary" icon={<RotateCcw size={18} aria-hidden />} onClick={() => changeStatus("upcoming")}>
            Reopen
          </Button>
        ) : (
          <>
            {item.status !== "in_progress" && (
              <Button variant="secondary" icon={<Play size={18} aria-hidden />} onClick={() => changeStatus("in_progress")}>
                Start
              </Button>
            )}
            <Button icon={<Check size={18} aria-hidden />} onClick={() => changeStatus("completed")}>
              Done
            </Button>
            <Button variant="ghost" icon={<SkipForward size={18} aria-hidden />} onClick={() => changeStatus("skipped")}>
              Skip
            </Button>
          </>
        )}
      </div>

      {item.is_recurring && (
        <p className={styles.info}>
          <Repeat size={16} aria-hidden />
          Part of your routine. Edits here change only this day.
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
