import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import ArtworkTray from "../components/editor/ArtworkTray.tsx";
import DownloadButton from "../components/editor/DownloadButton.tsx";
import EditorCanvas from "../components/editor/EditorCanvas.tsx";
import GarmentPicker from "../components/editor/GarmentPicker.tsx";
import LayerControls from "../components/editor/LayerControls.tsx";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";
import { SIDES } from "../lib/design.ts";
import { createLocalDesignStore, StorageQuotaError } from "../lib/store.ts";
import { designReducer, initialEditorState } from "../state/designReducer.ts";

/** Editor canvas size in pixels; the design itself is resolution-independent. */
const CANVAS_SIZE = 520;

/** Quiet period before the in-progress design is written to the draft slot. */
const AUTOSAVE_DELAY = 400;

export default function EditorRoute() {
  useDocumentTitle("Editor");
  const store = useMemo(() => createLocalDesignStore(), []);
  // The gallery hands a design over by writing it to the draft slot, so the
  // draft is also how "open in the editor" arrives.
  const [state, dispatch] = useReducer(designReducer, undefined, () =>
    initialEditorState(store.loadDraft() ?? undefined),
  );
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { design, currentSide } = state;

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

  const onSave = useCallback(() => {
    try {
      const saved = store.save(design);
      store.saveDraft(saved);
      setStatus(`Saved “${saved.name}” to My designs.`);
    } catch (error) {
      setStatus(
        error instanceof StorageQuotaError
          ? "This browser is out of storage, so the design could not be saved."
          : "Could not save the design.",
      );
    }
  }, [design, store]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-1 max-w-2xl text-base text-muted">
          Drag artwork onto the garment, then drag it to move it, or use its corner handles to
          scale and rotate. Everything is also available from the keyboard and the buttons on the
          right.
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        <section
          aria-label="Design canvas"
          className="flex min-h-[32rem] items-center justify-center rounded-2xl border border-rule bg-paper p-6 shadow-sm"
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
          className="flex min-h-[32rem] flex-col gap-6 rounded-2xl border border-rule bg-paper p-5 text-sm shadow-sm"
        >
          <GarmentPicker
            garment={design.garment}
            colour={design.colour}
            onChange={({ garment, colour }) => {
              dispatch({ type: "setGarment", garment });
              dispatch({ type: "setColour", colour });
            }}
          />
          <section aria-label="Garment side" className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Side</h2>
            <div className="grid grid-cols-2 gap-2">
              {SIDES.map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={side === currentSide}
                  onClick={() => dispatch({ type: "setSide", side })}
                  className={[
                    "rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    side === currentSide
                      ? "border border-ink bg-ink text-paper shadow-sm"
                      : "border border-rule bg-canvas text-ink hover:border-muted",
                  ].join(" ")}
                >
                  {side}
                </button>
              ))}
            </div>
          </section>
          <ArtworkTray state={state} dispatch={dispatch} canvasRef={canvasRef} />
          <section aria-label="Selected artwork">
            <LayerControls state={state} dispatch={dispatch} />
          </section>
          <div className="mt-auto flex flex-col gap-3 border-t border-rule pt-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Design name
              </span>
              <input
                type="text"
                value={design.name}
                onChange={(event) => dispatch({ type: "setName", name: event.target.value })}
                className="rounded-lg border border-rule bg-canvas px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
            <button
              type="button"
              onClick={onSave}
              className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper shadow-sm transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Save design
            </button>
            <DownloadButton design={design} side={currentSide} />
            <p role="status" aria-live="polite" className="text-xs font-medium text-accent">
              {status}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
