import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Overview } from "../modules/progress/components/Overview";
import { WeeklyReviewView } from "../modules/progress/components/WeeklyReviewView";
import styles from "./pages.module.css";

type Tab = "overview" | "week";

export function ProgressPage() {
  useDocumentTitle("Progress");
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <PageHeader title="Progress" subtitle="How your discipline is trending." />
      <div className={styles.tabs}>
        <SegmentedControl
          legend="Progress view"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "week", label: "Weekly review" },
          ]}
        />
      </div>
      {tab === "overview" ? <Overview /> : <WeeklyReviewView />}
    </>
  );
}
