import { ChevronDown, ListOrdered } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { CheckButton } from "../../../components/ui/CheckButton";
import { cn } from "../../../utils/cn";
import { useCheckRoutineStep } from "../hooks";
import type { RoutineToday } from "../types";
import styles from "./Routine.module.css";

/** Today's routine as a tappable checklist with "4 / 7" progress. Collapses when done. */
export function RoutineChecklist({ data }: { data: RoutineToday }) {
  const check = useCheckRoutineStep();
  const complete = data.total > 0 && data.completed === data.total;
  const [expanded, setExpanded] = useState(false);
  const open = !complete || expanded;

  if (!data.routine) {
    return (
      <Link to="/routine" className={styles.setup}>
        <ListOrdered size={20} aria-hidden />
        <span>
          <strong>Set up your morning routine</strong>
          <span>A short checklist to start every day the same way.</span>
        </span>
      </Link>
    );
  }

  const pct = data.total ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <section className={cn(styles.card, complete && styles.complete)} aria-labelledby="routine-heading">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={open}
          disabled={!complete}
        >
          <h2 id="routine-heading" className={styles.title}>
            {data.routine.name}
          </h2>
          <span className={styles.count}>
            {complete ? "Complete ✓" : `${data.completed} / ${data.total}`}
          </span>
          {complete && <ChevronDown size={18} aria-hidden className={cn(styles.chevron, open && styles.chevronOpen)} />}
        </button>
        <Link to="/routine" className={styles.edit}>
          Edit
        </Link>
      </div>
      <div className={styles.bar} aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>

      {open && (
        <ol className={styles.steps}>
          {data.items.map((step) => (
            <li key={step.id} className={cn(styles.step, step.done && styles.stepDone)}>
              <CheckButton
                checked={step.done}
                onToggle={() => check.mutate({ stepId: step.id, done: !step.done })}
                label={step.done ? `Untick ${step.title}` : `Tick ${step.title}`}
              />
              <span className={styles.stepTitle}>{step.title}</span>
              {step.duration_minutes && <span className={styles.stepMeta}>{step.duration_minutes} min</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
