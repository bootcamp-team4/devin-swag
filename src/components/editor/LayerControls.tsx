// Every transform the pointer handles offer, also as buttons: the handles are
// unusable with a keyboard or a screen reader on their own.
import type { Dispatch } from "react";
import { MARK_LABELS } from "../../lib/design.ts";
import type { DesignAction, EditorState } from "../../state/designReducer.ts";

const SCALE_STEP = 0.05;
const ROTATE_STEP = 15;

const BUTTON =
  "rounded-lg border border-rule bg-paper px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-canvas hover:border-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Props = { state: EditorState; dispatch: Dispatch<DesignAction> };

export default function LayerControls({ state, dispatch }: Props) {
  const selected = state.design.layers.find(
    (layer) => layer.id === state.selectedLayerId && layer.side === state.currentSide,
  );

  if (!selected) {
    return (
      <p className="rounded-lg border border-dashed border-rule bg-canvas p-3 text-xs text-muted">
        Select artwork on the garment to move, scale, or rotate it.
      </p>
    );
  }

  const label = MARK_LABELS[selected.markId];
  const id = selected.id;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <span className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-muted">
          {Math.round(selected.scale * 100)}% · {Math.round(selected.rotation)}°
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          onClick={() => dispatch({ type: "scaleLayer", id, scale: selected.scale + SCALE_STEP })}
        >
          Bigger
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => dispatch({ type: "scaleLayer", id, scale: selected.scale - SCALE_STEP })}
        >
          Smaller
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() =>
            dispatch({ type: "rotateLayer", id, rotation: selected.rotation - ROTATE_STEP })
          }
        >
          Rotate left
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() =>
            dispatch({ type: "rotateLayer", id, rotation: selected.rotation + ROTATE_STEP })
          }
        >
          Rotate right
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => dispatch({ type: "reorderLayer", id, direction: "up" })}
        >
          Bring forward
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => dispatch({ type: "reorderLayer", id, direction: "down" })}
        >
          Send back
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => dispatch({ type: "duplicateLayer", id })}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="rounded-lg border border-rule bg-paper px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => dispatch({ type: "deleteLayer", id })}
        >
          Delete
        </button>
      </div>
      <p className="text-xs text-muted">
        Keyboard: arrows move, <kbd>+</kbd>/<kbd>-</kbd> scale, <kbd>[</kbd>/<kbd>]</kbd> rotate,
        <kbd>Delete</kbd> removes, <kbd>Esc</kbd> deselects.
      </p>
    </div>
  );
}
