import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface ComingSoonPageProps {
  title: string;
  icon: LucideIcon;
  description: string;
}

/** Placeholder for sections whose phase hasn't been built yet. */
export function ComingSoonPage({ title, icon, description }: ComingSoonPageProps) {
  useDocumentTitle(title);
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} title="Coming soon" description={description} />
    </>
  );
}
