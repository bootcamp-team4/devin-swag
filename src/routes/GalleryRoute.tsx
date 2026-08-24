import { useDocumentTitle } from "../components/useDocumentTitle.ts";

export default function GalleryRoute() {
  useDocumentTitle("My designs");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My designs</h1>
        <p className="mt-1 text-sm text-muted">
          Saved designs will be listed here. The list arrives with a later change.
        </p>
      </div>
      <section
        aria-label="Saved designs"
        className="min-h-[24rem] rounded-sm border border-rule p-4 text-sm text-muted"
      >
        No designs yet.
      </section>
    </div>
  );
}
