import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DesignCard from "../components/gallery/DesignCard.tsx";
import {
  deleteDesign,
  duplicateDesign,
  listDesigns,
  openInEditor,
  renameDesign,
} from "../components/gallery/actions.ts";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";
import type { Design } from "../lib/design.ts";
import { createLocalDesignStore, type DesignStore } from "../lib/store.ts";

/** `null` while the store has not been read yet — localStorage is read after first paint. */
type Designs = Design[] | null;

export default function GalleryRoute({ store }: { store?: DesignStore }) {
  useDocumentTitle("My designs");
  const navigate = useNavigate();
  const designStore = useMemo(() => store ?? createLocalDesignStore(), [store]);
  const [designs, setDesigns] = useState<Designs>(null);

  const refresh = useCallback(() => setDesigns(listDesigns(designStore)), [designStore]);

  useEffect(() => {
    refresh();
    return designStore.subscribe(refresh);
  }, [designStore, refresh]);

  const handleOpen = (design: Design) => {
    openInEditor(designStore, design.id);
    void navigate("/");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My designs</h1>
        <p className="mt-1 max-w-2xl text-base text-muted">
          Designs are stored in this browser only — clearing site data removes them. Download a PNG
          to keep a copy.
        </p>
      </div>

      <section aria-label="Saved designs">
        {designs === null ? (
          <p className="text-sm text-muted" role="status">
            Loading your designs…
          </p>
        ) : designs.length === 0 ? (
          <div className="rounded-2xl border border-rule bg-paper p-8 text-center shadow-sm">
            <h2 className="text-base font-semibold">No designs yet</h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted">
              Pick a garment in the editor, drag a mark onto it, and save it — it will show up here.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper no-underline shadow-sm transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start your first design
            </Link>
          </div>
        ) : (
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-5 p-0">
            {designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onOpen={handleOpen}
                onRename={(target, name) => {
                  renameDesign(designStore, target.id, name);
                  refresh();
                }}
                onDuplicate={(target) => {
                  duplicateDesign(designStore, target.id);
                  refresh();
                }}
                onDelete={(target) => {
                  deleteDesign(designStore, target.id);
                  refresh();
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
