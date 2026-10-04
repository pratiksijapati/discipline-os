import { useState, type FormEvent } from "react";
import { Button } from "../../../components/ui/Button";
import { FormAlert } from "../../../components/ui/FormAlert";
import styles from "./Wake.module.css";

interface MathChallengeProps {
  problems: string[];
  onSubmit: (answers: number[]) => void;
  submitting: boolean;
  error: string | null;
}

/** Three quick problems — enough to get your brain switched on. Checked by the server. */
export function MathChallenge({ problems, onSubmit, submitting, error }: MathChallengeProps) {
  const [answers, setAnswers] = useState<string[]>(() => problems.map(() => ""));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(answers.map((a) => Number(a)));
  }

  return (
    <form className={styles.math} onSubmit={handleSubmit} noValidate>
      <p className={styles.kicker}>Math challenge</p>
      <FormAlert message={error} />
      {problems.map((problem, i) => (
        <label key={problem + i} className={styles.problem}>
          <span>{problem} =</span>
          <input
            type="number"
            inputMode="numeric"
            value={answers[i]}
            onChange={(e) => setAnswers((current) => current.map((a, j) => (j === i ? e.target.value : a)))}
            autoFocus={i === 0}
            aria-label={`Answer to ${problem}`}
          />
        </label>
      ))}
      <Button type="submit" size="lg" block loading={submitting} disabled={answers.some((a) => a.trim() === "")}>
        Check answers
      </Button>
    </form>
  );
}
