import { useReducer, useRef } from "react";
import ArtworkTray from "../components/editor/ArtworkTray.tsx";
import EditorCanvas from "../components/editor/EditorCanvas.tsx";
import { useDocumentTitle } from "../components/useDocumentTitle.ts";
import { designReducer, initialEditorState } from "../state/designReducer.ts";

/** Editor canvas size in pixels; the design itself is resolution-independent. */
const CANVAS_SIZE = 520;

export default function EditorRoute() {
  useDocumentTitle("Editor");
  const [state, dispatch] = useReducer(designReducer, undefined, () => initialEditorState());
  const canvasRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-1 text-sm text-muted">
          Drag artwork onto the garment, then drag it to move it. Arrow keys nudge the selected
          artwork, Delete removes it, Escape deselects.
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
          className="min-h-[32rem] rounded-sm border border-rule p-4 text-sm"
        >
          <ArtworkTray state={state} dispatch={dispatch} canvasRef={canvasRef} />
        </aside>
      </div>
    </div>
  );
}
