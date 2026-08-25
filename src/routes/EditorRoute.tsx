import { useDocumentTitle } from "../components/useDocumentTitle.ts";

export default function EditorRoute() {
  useDocumentTitle("Editor");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a garment, drag artwork onto it, then save the design. The canvas arrives with a later
          change.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <section
          aria-label="Design canvas"
          className="min-h-[32rem] rounded-sm border border-rule flex items-center justify-center text-sm text-muted"
        >
          Canvas
        </section>
        <aside
          aria-label="Design controls"
          className="min-h-[32rem] rounded-sm border border-rule p-4 text-sm text-muted"
        >
          Garment, artwork, and layer controls
        </aside>
      </div>
    </div>
  );
}
