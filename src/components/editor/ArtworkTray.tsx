import { useRef, type Dispatch, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { MARK_IDS, MARK_LABELS, type MarkId } from "../../lib/design.ts";
import {
  INK_TOKEN,
  MARK_COGNITION_SVG,
  MARK_DEVIN_ON_WHITE_PNG,
  MARK_OTTER_PNG,
} from "../../brand/marks.ts";
import type { DesignAction, EditorState } from "../../state/designReducer.ts";
import { isInsideRect, pointToFraction } from "./canvasPoint.ts";

/** Pointer travel, in pixels, above which a press counts as a drag. */
const DRAG_THRESHOLD = 4;

/** Tray thumbnails sit on the light panel, so the ink is always dark. */
function previewSrc(markId: MarkId): string {
  if (markId === "otter") return MARK_OTTER_PNG;
  if (markId === "devin") return MARK_DEVIN_ON_WHITE_PNG;
  const svg = MARK_COGNITION_SVG.replaceAll(INK_TOKEN, "#0a0a0a");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Props = {
  state: EditorState;
  dispatch: Dispatch<DesignAction>;
  canvasRef: RefObject<HTMLDivElement | null>;
};

export default function ArtworkTray({ state, dispatch, canvasRef }: Props) {
  const press = useRef<{ x: number; y: number; placed: boolean } | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    press.current = { x: event.clientX, y: event.clientY, placed: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>, markId: MarkId) {
    const start = press.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start) return;
    const travel = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (travel < DRAG_THRESHOLD || !rect || !isInsideRect(rect, event.clientX, event.clientY)) {
      // Either a plain click, or a drop that missed: leave it to the click
      // handler, which places the mark at the centre of the printable area.
      return;
    }
    const at = pointToFraction(rect, event.clientX, event.clientY, state.design.garment);
    dispatch({ type: "addLayer", markId, at });
    // The click event still follows the drop; it must not place a second mark.
    press.current = { ...start, placed: true };
  }

  function onClick(event: { detail: number }, markId: MarkId) {
    // Enter and Space synthesise a click with detail 0; only a real pointer
    // click can be the tail of a drop we have already handled.
    if (event.detail > 0 && press.current?.placed) {
      press.current = null;
      return;
    }
    dispatch({ type: "addLayer", markId });
  }

  return (
    <section aria-label="Artwork" className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Artwork</h2>
      <p className="text-xs text-muted">
        Drag a mark onto the garment, or press it to place it in the middle.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {MARK_IDS.map((markId) => (
          <li key={markId}>
            <button
              type="button"
              data-mark={markId}
              className="flex w-full items-center gap-3 rounded-xl border border-rule bg-paper px-3 py-2.5 text-left text-sm transition-all hover:border-accent hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ touchAction: "none", cursor: "grab" }}
              onPointerDown={onPointerDown}
              onPointerUp={(event) => onPointerUp(event, markId)}
              onClick={(event) => onClick(event, markId)}
            >
              <img
                src={previewSrc(markId)}
                alt=""
                className="h-9 w-16 object-contain"
                draggable={false}
              />
              <span className="font-medium">{MARK_LABELS[markId]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
