import { Link } from "react-router-dom";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";

export default function NotFoundRoute() {
  useDocumentTitle("Page not found");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-muted">That page does not exist in the designer.</p>
      </div>
      <Link to="/" className="text-sm underline underline-offset-4">
        Back to the editor
      </Link>
    </div>
  );
}
