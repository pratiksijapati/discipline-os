import { Moon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toApiError } from "../../../api/errors";
import { useToast } from "../../../components/toast/useToast";
import { Button } from "../../../components/ui/Button";
import { TextAreaField } from "../../../components/ui/Field";
import { FormAlert } from "../../../components/ui/FormAlert";
import { reflectionApi } from "../api";
import { useCompleteReview, useSaveReview } from "../hooks";
import type { ReflectionInput, ReviewState } from "../types";
import { DayStatsCard } from "./DayStatsCard";
import { RatingPicker, ScalePicker } from "./Pickers";
import styles from "./Review.module.css";

const AUTOSAVE_DELAY_MS = 800;

interface Values {
  day_rating: number | null;
  went_well: string;
  improve: string;
  grateful: string;
  energy: number | null;
  mood: number | null;
}

export function ReviewForm({ state, onCompleted }: { state: ReviewState; onCompleted: () => void }) {
  const { toast } = useToast();
  const save = useSaveReview();
  const complete = useCompleteReview();
  const r = state.reflection;
  const [values, setValues] = useState<Values>({
    day_rating: r?.day_rating ?? null,
    went_well: r?.went_well ?? "",
    improve: r?.improve ?? "",
    grateful: r?.grateful ?? "",
    energy: r?.energy ?? null,
    mood: r?.mood ?? null,
  });
  const [error, setError] = useState<string | null>(null);

  // Drafts are saved shortly after you stop typing, so nothing is lost if you're interrupted.
  const pending = useRef<ReflectionInput>({});
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (Object.keys(pending.current).length > 0) void reflectionApi.save(pending.current);
    },
    [],
  );

  function flush() {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length > 0) save.mutate(patch);
  }

  function update<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    pending.current = { ...pending.current, [field]: value };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, AUTOSAVE_DELAY_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.day_rating) {
      setError("Pick how your day was first.");
      return;
    }
    window.clearTimeout(timer.current);
    pending.current = {};
    setError(null);
    complete.mutate(values, {
      onSuccess: () => {
        toast(r?.is_completed ? "Review updated ✓" : "Day complete ✓");
        onCompleted();
      },
      onError: (err) => setError(toApiError(err).message),
    });
  }

  const saveStatus = save.isPending ? "Saving…" : save.isSuccess ? "Draft saved" : save.isError ? "Couldn't save draft" : "";

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <RatingPicker value={values.day_rating} onChange={(v) => update("day_rating", v)} />

      <DayStatsCard stats={state.stats} />

      <TextAreaField
        label="What went well today?"
        value={values.went_well}
        onChange={(e) => update("went_well", e.target.value)}
        placeholder="Wins, big or small"
      />
      <TextAreaField
        label="What should I improve tomorrow?"
        value={values.improve}
        onChange={(e) => update("improve", e.target.value)}
        placeholder="One thing to do better"
      />
      <TextAreaField
        label="What am I grateful for today?"
        optional
        value={values.grateful}
        onChange={(e) => update("grateful", e.target.value)}
      />

      <div className={styles.scales}>
        <ScalePicker legend="Energy" value={values.energy} onChange={(v) => update("energy", v)} low="Drained" high="Energized" />
        <ScalePicker legend="Mood" value={values.mood} onChange={(v) => update("mood", v)} low="Low" high="Great" />
      </div>

      <FormAlert message={error} />
      <div className={styles.submit}>
        <Button type="submit" size="lg" block icon={<Moon size={20} aria-hidden />} loading={complete.isPending}>
          {r?.is_completed ? "Update review" : "Complete Day"}
        </Button>
        <p className={styles.saveStatus} aria-live="polite">
          {saveStatus}
        </p>
      </div>
    </form>
  );
}
