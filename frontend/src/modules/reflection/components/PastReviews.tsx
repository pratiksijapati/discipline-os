import { Button } from "../../../components/ui/Button";
import { formatDay } from "../../../utils/time";
import { ratingEmoji } from "../constants";
import { useReviewHistory } from "../hooks";
import styles from "./Review.module.css";

/** Earlier completed reviews, newest first. */
export function PastReviews({ excludeDate }: { excludeDate: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useReviewHistory();
  const rows = (data?.pages.flatMap((page) => page.results) ?? []).filter((r) => r.date !== excludeDate);
  if (rows.length === 0) return null;

  return (
    <section className={styles.past} aria-labelledby="past-reviews">
      <h2 id="past-reviews">Past reviews</h2>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>
            <details>
              <summary>
                <span className={styles.pastEmoji} aria-hidden>
                  {ratingEmoji(r.day_rating)}
                </span>
                <span className={styles.pastDate}>{formatDay(r.date)}</span>
                {"progress" in r.stats && <span className={styles.pastPct}>{r.stats.progress}%</span>}
              </summary>
              <div className={styles.pastBody}>
                {r.went_well && (
                  <p>
                    <strong>Went well:</strong> {r.went_well}
                  </p>
                )}
                {r.improve && (
                  <p>
                    <strong>Improve:</strong> {r.improve}
                  </p>
                )}
                {r.grateful && (
                  <p>
                    <strong>Grateful:</strong> {r.grateful}
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button variant="secondary" block onClick={() => void fetchNextPage()} loading={isFetchingNextPage}>
          Load more
        </Button>
      )}
    </section>
  );
}
