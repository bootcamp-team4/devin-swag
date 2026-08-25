import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import ArtworkTray from "../components/editor/ArtworkTray.tsx";
import DownloadButton from "../components/editor/DownloadButton.tsx";
import EditorCanvas from "../components/editor/EditorCanvas.tsx";
import GarmentPicker from "../components/editor/GarmentPicker.tsx";
import LayerControls from "../components/editor/LayerControls.tsx";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";
import { createSharedDesignStore } from "../lib/sharedStore.ts";
import { StorageQuotaError } from "../lib/store.ts";
import { designReducer, initialEditorState } from "../state/designReducer.ts";

/** Editor canvas size in pixels; the design itself is resolution-independent. */
const CANVAS_SIZE = 520;

/** Quiet period before the in-progress design is written to the draft slot. */
const AUTOSAVE_DELAY = 400;

export default function EditorRoute() {
  useDocumentTitle("Editor");
  const store = useMemo(() => createSharedDesignStore(), []);
  // The gallery hands a design over by writing it to the draft slot, so the
  // draft is also how "open in the editor" arrives.
  const [state, dispatch] = useReducer(designReducer, undefined, () =>
    initialEditorState(store.loadDraft() ?? undefined),
  );
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { design } = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        store.saveDraft(design);
      } catch (error) {
        setStatus(
          error instanceof StorageQuotaError
            ? "This browser is out of storage, so your work is not being saved."
            : "Could not autosave your work.",
        );
      }
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [design, store]);

  const onSave = useCallback(async () => {
    setStatus("Saving…");
    try {
      const saved = await store.save(design);
      store.saveDraft(saved);
      setStatus(
        store.mode() === "shared"
          ? `Saved “${saved.name}” to Saved designs, visible to everyone.`
          : `Saved “${saved.name}” to Saved designs in this browser — the shared gallery is unavailable.`,
      );
    } catch (error) {
      setStatus(
        error instanceof StorageQuotaError
          ? "This browser is out of storage, so the design could not be saved."
          : "Could not save the design.",
      );
    }
  }, [design, store]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-1 text-sm text-muted">
          Drag artwork onto the garment, then drag it to move it, or use its corner handles to
          scale and rotate. Everything is also available from the keyboard and the buttons on the
          right.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <section
          aria-label="Design canvas"
          className="min-h-[32rem] rounded-sm border border-rule flex items-center justify-center"
        >
          <EditorCanvas
            state={state}
            dispatch={dispatch}
            size={CANVAS_SIZE}
            canvasRef={canvasRef}
          />
        </section>
        <aside
          aria-label="Design controls"
          className="min-h-[32rem] rounded-sm border border-rule p-4 text-sm flex flex-col gap-6"
        >
          <GarmentPicker
            garment={design.garment}
            colour={design.colour}
            onChange={({ garment, colour }) => {
              dispatch({ type: "setGarment", garment });
              dispatch({ type: "setColour", colour });
            }}
          />
          <ArtworkTray state={state} dispatch={dispatch} canvasRef={canvasRef} />
          <section aria-label="Selected artwork">
            <LayerControls state={state} dispatch={dispatch} />
          </section>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-ink">Design name</span>
              <input
                type="text"
                value={design.name}
                onChange={(event) => dispatch({ type: "setName", name: event.target.value })}
                className="rounded-sm border border-rule px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </label>
            <button
              type="button"
              onClick={() => void onSave()}
              className="self-start rounded-sm border border-rule px-3 py-2 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Save design
            </button>
            <DownloadButton design={design} />
            <p role="status" aria-live="polite" className="text-xs text-muted">
              {status}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
