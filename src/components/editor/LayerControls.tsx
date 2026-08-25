// Every transform the pointer handles offer, also as buttons: the handles are
// unusable with a keyboard or a screen reader on their own.
import type { Dispatch } from "react";
import { MARK_LABELS } from "../../lib/design.ts";
import type { DesignAction, EditorState } from "../../state/designReducer.ts";

const SCALE_STEP = 0.05;
const ROTATE_STEP = 15;

const BUTTON =
  "rounded-sm border border-rule px-2 py-1 text-xs hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type Props = { state: EditorState; dispatch: Dispatch<DesignAction> };

export default function LayerControls({ state, dispatch }: Props) {
  const selected = state.design.layers.find((layer) => layer.id === state.selectedLayerId);

  if (!selected) {
    return (
      <p className="text-xs text-muted">
        Select artwork on the garment to move, scale, or rotate it.
      </p>
    );
  }

  const label = MARK_LABELS[selected.markId];
  const id = selected.id;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted">
        {Math.round(selected.scale * 100)}% · {Math.round(selected.rotation)}°
      </p>
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
          className={BUTTON}
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
