import { useState } from "react";
import { useCurrentUser } from "../auth/useAuth";
import { LoadError } from "../components/LoadError";
import { PageHeader } from "../components/PageHeader";
import { PageLoader } from "../components/StatusScreen";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { PastReviews } from "../modules/reflection/components/PastReviews";
import { ReviewForm } from "../modules/reflection/components/ReviewForm";
import { ReviewSummary } from "../modules/reflection/components/ReviewSummary";
import { useCurrentReview } from "../modules/reflection/hooks";
import { formatDay, todayIn } from "../utils/time";

export function ReflectionPage() {
  useDocumentTitle("Night review");
  const user = useCurrentUser();
  const { data, isLoading, error, refetch } = useCurrentReview();
  const [editing, setEditing] = useState(false);

  const isYesterday = data && data.date !== todayIn(user.timezone);
  const header = (
    <PageHeader
      title="Night review"
      eyebrow={data ? `${formatDay(data.date)}${isYesterday ? " · yesterday" : ""}` : undefined}
      subtitle={data?.reflection?.is_completed && !editing ? undefined : "Two minutes to close the day."}
    />
  );

  if (isLoading) return (<>{header}<PageLoader /></>);
  if (error || !data) return (<>{header}<LoadError error={error} onRetry={() => void refetch()} /></>);

  const completed = data.reflection?.is_completed ?? false;

  return (
    <>
      {header}
      {completed && !editing ? (
        <ReviewSummary state={data} onEdit={() => setEditing(true)} />
      ) : (
        <ReviewForm key={data.date} state={data} onCompleted={() => setEditing(false)} />
      )}
      <PastReviews excludeDate={data.date} />
    </>
  );
}
