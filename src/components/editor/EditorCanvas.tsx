import {
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { layerBox, MARK_LABELS, type Layer } from "../../lib/design.ts";
import { renderDesign, toReactSvg, type SceneMark } from "../../lib/render.ts";
import type { DesignAction, EditorState } from "../../state/designReducer.ts";
import { pointToFraction } from "./canvasPoint.ts";

/** Arrow-key step, in printable-area fractions; Shift takes bigger strides. */
const NUDGE = 0.02;
const NUDGE_COARSE = 0.1;

type Props = {
  state: EditorState;
  dispatch: Dispatch<DesignAction>;
  size: number;
  canvasRef: RefObject<HTMLDivElement | null>;
};

export default function EditorCanvas({ state, dispatch, size, canvasRef }: Props) {
  const { design, selectedLayerId } = state;
  // Where inside the artwork the drag started, so it does not jump to centre.
  const grab = useRef<{ x: number; y: number } | null>(null);

  const scene = renderDesign(design, size);

  // Placing a mark hands the keyboard the thing that was just placed, so arrow
  // keys and Delete work without hunting for it with Tab.
  useEffect(() => {
    if (!selectedLayerId) return;
    const node = canvasRef.current?.querySelector<SVGImageElement>(
      `image[data-layer-id="${selectedLayerId}"]`,
    );
    if (node && document.activeElement !== node) node.focus();
  }, [selectedLayerId, canvasRef]);

  function startDrag(event: ReactPointerEvent<SVGImageElement>, layer: Layer) {
    event.preventDefault();
    dispatch({ type: "selectLayer", id: layer.id });
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const at = pointToFraction(rect, event.clientX, event.clientY, design.garment);
    grab.current = { x: at.x - layer.x, y: at.y - layer.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDrag(event: ReactPointerEvent<SVGImageElement>, layer: Layer) {
    const offset = grab.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!offset || !rect || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const at = pointToFraction(rect, event.clientX, event.clientY, design.garment);
    // Clamping happens in the reducer on every move, not only on drop.
    dispatch({ type: "moveLayer", id: layer.id, x: at.x - offset.x, y: at.y - offset.y });
  }

  function endDrag(event: ReactPointerEvent<SVGImageElement>) {
    grab.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function markProps(mark: SceneMark) {
    const layer = design.layers.find((candidate) => candidate.id === mark.layerId);
    if (!layer) return {};
    return {
      tabIndex: 0,
      role: "button",
      "aria-label": `${MARK_LABELS[layer.markId]} layer`,
      "aria-pressed": layer.id === selectedLayerId,
      style: { cursor: "grab", touchAction: "none" },
      onPointerDown: (event: ReactPointerEvent<SVGImageElement>) => startDrag(event, layer),
      onPointerMove: (event: ReactPointerEvent<SVGImageElement>) => onDrag(event, layer),
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onFocus: () => dispatch({ type: "selectLayer", id: layer.id }),
    };
  }

  const selected = design.layers.find((layer) => layer.id === selectedLayerId);
  const box = selected ? layerBox(selected, design.garment, size) : null;

  return (
    <div
      ref={canvasRef}
      className="relative select-none"
      style={{ width: size, height: size }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          dispatch({ type: "selectLayer", id: null });
          (document.activeElement as HTMLElement | null)?.blur();
          return;
        }
        if (!selectedLayerId) return;
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          dispatch({ type: "deleteLayer", id: selectedLayerId });
          return;
        }
        const step = event.shiftKey ? NUDGE_COARSE : NUDGE;
        const deltas: Record<string, { dx: number; dy: number }> = {
          ArrowLeft: { dx: -step, dy: 0 },
          ArrowRight: { dx: step, dy: 0 },
          ArrowUp: { dx: 0, dy: -step },
          ArrowDown: { dx: 0, dy: step },
        };
        const delta = deltas[event.key];
        if (!delta) return;
        event.preventDefault();
        dispatch({ type: "nudgeLayer", id: selectedLayerId, ...delta });
      }}
      onPointerDown={(event) => {
        // A press on the garment itself, not on artwork, clears the selection.
        if (event.target === event.currentTarget || (event.target as Element).tagName !== "image") {
          dispatch({ type: "selectLayer", id: null });
        }
      }}
    >
      {toReactSvg(scene, { markProps, showPrintableArea: true, className: "block" })}
      {box ? (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0"
        >
          <rect
            x={box.cx - box.width / 2}
            y={box.cy - box.height / 2}
            width={box.width}
            height={box.height}
            transform={selected?.rotation ? `rotate(${selected.rotation} ${box.cx} ${box.cy})` : undefined}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </svg>
      ) : null}
    </div>
  );
}
