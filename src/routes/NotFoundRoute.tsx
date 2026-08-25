import { Link } from "react-router-dom";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";

export default function NotFoundRoute() {
  useDocumentTitle("Page not found");

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rule bg-paper p-12 text-center shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-muted">That page does not exist in the designer.</p>
      </div>
      <Link
        to="/"
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper no-underline shadow-sm transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to the editor
      </Link>
    </div>
  );
}
