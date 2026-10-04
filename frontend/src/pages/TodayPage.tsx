import { Sunrise } from "lucide-react";
import { useCurrentUser } from "../auth/useAuth";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatLongDate, greeting } from "../utils/date";

export function TodayPage() {
  useDocumentTitle("Today");
  const user = useCurrentUser();

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(user.timezone)}
        title={`${greeting(user.timezone)}, ${user.first_name}`}
      />
      <EmptyState
        icon={Sunrise}
        title="Your day will live here"
        description="Next up: your schedule, tasks and what to do right now. They arrive with the Today system."
      />
    </>
  );
}
