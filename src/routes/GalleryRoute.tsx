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
import { createSharedDesignStore, type SharedDesignStore } from "../lib/sharedStore.ts";

/** `null` while the store has not been read yet — the gallery loads after first paint. */
type Designs = Design[] | null;

export default function GalleryRoute({ store }: { store?: SharedDesignStore }) {
  useDocumentTitle("Saved designs");
  const navigate = useNavigate();
  const designStore = useMemo(() => store ?? createSharedDesignStore(), [store]);
  const [designs, setDesigns] = useState<Designs>(null);
  const [shared, setShared] = useState(true);

  const refresh = useCallback(async () => {
    const listed = await listDesigns(designStore);
    setDesigns(listed);
    setShared(designStore.mode() === "shared");
  }, [designStore]);

  useEffect(() => {
    void refresh();
    return designStore.subscribe(() => void refresh());
  }, [designStore, refresh]);

  const handleOpen = async (design: Design) => {
    await openInEditor(designStore, design.id);
    void navigate("/");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Saved designs</h1>
        <p className="mt-1 text-sm text-muted">
          {shared
            ? "Everyone shares this gallery: every design saved here is visible to everyone, and anyone can open, rename, or delete it."
            : "The shared gallery is unavailable, so these are the designs saved in this browser only."}
        </p>
      </div>

      <section aria-label="Saved designs">
        {designs === null ? (
          <p className="text-sm text-muted" role="status">
            Loading saved designs…
          </p>
        ) : designs.length === 0 ? (
          <div className="rounded-sm border border-rule p-6">
            <h2 className="text-base font-medium">No designs yet</h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              Pick a garment in the editor, drag a mark onto it, and save it — it will show up here.
            </p>
            <Link
              to="/"
              className="mt-3 inline-block rounded-sm border border-rule px-3 py-1 text-sm no-underline hover:bg-rule/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Start your first design
            </Link>
          </div>
        ) : (
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4 p-0">
            {designs.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onOpen={(target) => void handleOpen(target)}
                onRename={(target, name) => {
                  void renameDesign(designStore, target.id, name).then(refresh);
                }}
                onDuplicate={(target) => {
                  void duplicateDesign(designStore, target.id).then(refresh);
                }}
                onDelete={(target) => {
                  void deleteDesign(designStore, target.id).then(refresh);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
