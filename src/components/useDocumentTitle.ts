import { useEffect } from "react";

const SUFFIX = "Cognition Merch Designer";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — ${SUFFIX}`;
  }, [title]);
}
