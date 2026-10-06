import { Pencil, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toApiError } from "../../../api/errors";
import { useCurrentUser } from "../../../auth/useAuth";
import { LoadError } from "../../../components/LoadError";
import { PageLoader } from "../../../components/StatusScreen";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { EmptyState } from "../../../components/ui/EmptyState";
import { formatTimeRange } from "../../../utils/time";
import { CATEGORY_META, describeRepeat } from "../constants";
import { useDeleteTemplate, useTemplates } from "../hooks";
import type { ScheduleTemplate } from "../types";
import styles from "./TemplateList.module.css";

interface TemplateListProps {
  onEdit: (template: ScheduleTemplate) => void;
  onAdd: () => void;
}

/** Your repeating plan: the rules that fill each day automatically. */
export function TemplateList({ onEdit, onAdd }: TemplateListProps) {
  const weekStart = useCurrentUser().settings.week_start;
  const { data, isLoading, error, refetch } = useTemplates();
  const remove = useDeleteTemplate();
  const { toast } = useToast();
  const [toDelete, setToDelete] = useState<ScheduleTemplate | null>(null);

  if (isLoading) return <PageLoader />;
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;

  if (!data?.length) {
    return (
      <EmptyState
        icon={Repeat}
        title="No repeating items yet"
        description="Add the things you do regularly — wake up, workout, study — and they'll appear on every matching day."
        action={<Button onClick={onAdd}>Add a repeating item</Button>}
      />
    );
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast("Removed from your repeating plan");
      setToDelete(null);
    } catch (err) {
      toast(toApiError(err).message, "error");
    }
  }

  return (
    <>
      <ul className={styles.list}>
        {data.map((template) => {
          const Icon = CATEGORY_META[template.category].icon;
          return (
            <li key={template.id} className={styles.item}>
              <span className={styles.icon} aria-hidden>
                <Icon size={20} />
              </span>
              <div className={styles.text}>
                <span className={styles.title}>{template.title}</span>
                <span className={styles.meta}>
                  {formatTimeRange(template.start_time, template.end_time)} ·{" "}
                  {describeRepeat(template.repeat, template.days_of_week, weekStart)}
                </span>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => onEdit(template)} aria-label={`Edit ${template.title}`}>
                <Pencil size={18} aria-hidden />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setToDelete(template)}
                aria-label={`Delete ${template.title}`}
              >
                <Trash2 size={18} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete "${toDelete?.title ?? ""}"?`}
        message="It will stop appearing on future days. Days you've already completed stay in your history."
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
        busy={remove.isPending}
      />
    </>
  );
}
