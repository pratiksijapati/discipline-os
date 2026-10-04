import { useEffect } from "react";

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Discipline OS` : "Discipline OS";
  }, [title]);
}
