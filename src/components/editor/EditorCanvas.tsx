import {
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  layerBox,
  MARK_LABELS,
  printableRect,
  type Layer,
} from "../../lib/design.ts";
import { renderDesign, toReactSvg, type SceneMark } from "../../lib/render.ts";
import type { DesignAction, EditorState } from "../../state/designReducer.ts";
import { pointToFraction } from "./canvasPoint.ts";

/** Arrow-key step, in printable-area fractions; Shift takes bigger strides. */
const NUDGE = 0.02;
const NUDGE_COARSE = 0.1;

/** Keyboard transform steps: a scale fraction and an angle in degrees. */
const SCALE_STEP = 0.05;
const ROTATE_STEP = 15;

/** Radius of a transform handle, and how far the rotate handle floats above. */
const HANDLE_RADIUS = 7;
const ROTATE_ARM = 28;

type Props = {
  state: EditorState;
  dispatch: Dispatch<DesignAction>;
  size: number;
  canvasRef: RefObject<HTMLDivElement | null>;
};

export default function EditorCanvas({ state, dispatch, size, canvasRef }: Props) {
  const { design, selectedLayerId, currentSide } = state;
  // Where inside the artwork the drag started, so it does not jump to centre.
  const grab = useRef<{ x: number; y: number } | null>(null);
  const transform = useRef<"scale" | "rotate" | null>(null);

  const scene = renderDesign(design, size, currentSide);

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

  const selected = design.layers.find(
    (layer) => layer.id === selectedLayerId && layer.side === currentSide,
  );
  const box = selected ? layerBox(selected, design.garment, size) : null;

  /** Pointer position in canvas pixels, measured from the artwork's centre. */
  function centreOffset(event: ReactPointerEvent<SVGGeometryElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !box) return null;
    return { dx: event.clientX - rect.left - box.cx, dy: event.clientY - rect.top - box.cy };
  }

  function startTransform(
    event: ReactPointerEvent<SVGGeometryElement>,
    kind: "scale" | "rotate",
  ) {
    event.preventDefault();
    event.stopPropagation();
    transform.current = kind;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onTransform(event: ReactPointerEvent<SVGGeometryElement>) {
    if (!selected || !transform.current) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const offset = centreOffset(event);
    if (!offset) return;

    if (transform.current === "rotate") {
      // The handle sits above the artwork, so straight up is 0°.
      const degrees = (Math.atan2(offset.dy, offset.dx) * 180) / Math.PI + 90;
      dispatch({ type: "rotateLayer", id: selected.id, rotation: degrees });
      return;
    }

    // Undo the layer's rotation so the corner handle tracks the pointer, then
    // read the half-width back out in printable-area fractions.
    const radians = (selected.rotation * Math.PI) / 180;
    const localX = offset.dx * Math.cos(-radians) - offset.dy * Math.sin(-radians);
    const area = printableRect(design.garment, size);
    dispatch({
      type: "scaleLayer",
      id: selected.id,
      scale: (Math.abs(localX) * 2) / area.width,
    });
  }

  function endTransform(event: ReactPointerEvent<SVGGeometryElement>) {
    transform.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleProps(kind: "scale" | "rotate") {
    return {
      r: HANDLE_RADIUS,
      fill: "#ffffff",
      stroke: "#2563eb",
      strokeWidth: 2,
      style: { cursor: kind === "scale" ? "nwse-resize" : "grab", touchAction: "none" as const },
      onPointerDown: (event: ReactPointerEvent<SVGGeometryElement>) =>
        startTransform(event, kind),
      onPointerMove: onTransform,
      onPointerUp: endTransform,
      onPointerCancel: endTransform,
    };
  }

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
        if (selected) {
          const scaleBy = { "+": SCALE_STEP, "=": SCALE_STEP, "-": -SCALE_STEP }[event.key];
          if (scaleBy !== undefined) {
            event.preventDefault();
            dispatch({
              type: "scaleLayer",
              id: selected.id,
              scale: selected.scale + scaleBy,
            });
            return;
          }
          const rotateBy = { "[": -ROTATE_STEP, "]": ROTATE_STEP }[event.key];
          if (rotateBy !== undefined) {
            event.preventDefault();
            dispatch({
              type: "rotateLayer",
              id: selected.id,
              rotation: selected.rotation + rotateBy,
            });
            return;
          }
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
      {box && selected ? (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          <g
            transform={
              selected.rotation ? `rotate(${selected.rotation} ${box.cx} ${box.cy})` : undefined
            }
            style={{ pointerEvents: "auto" }}
          >
            <line
              x1={box.cx}
              y1={box.cy - box.height / 2}
              x2={box.cx}
              y2={box.cy - box.height / 2 - ROTATE_ARM}
              stroke="#2563eb"
              strokeWidth={2}
              style={{ pointerEvents: "none" }}
            />
            {/* The visible arm is 2px wide. This invisible one is a grabbable
                target, so pressing the arm rotates instead of falling through
                to the canvas, which reads a press off the artwork as
                "deselect". */}
            <line
              x1={box.cx}
              y1={box.cy - box.height / 2}
              x2={box.cx}
              y2={box.cy - box.height / 2 - ROTATE_ARM}
              stroke="transparent"
              strokeWidth={HANDLE_RADIUS * 2}
              style={{ cursor: "grab", touchAction: "none" }}
              onPointerDown={(event) => startTransform(event, "rotate")}
              onPointerMove={onTransform}
              onPointerUp={endTransform}
              onPointerCancel={endTransform}
            />
            <circle
              cx={box.cx}
              cy={box.cy - box.height / 2 - ROTATE_ARM}
              {...handleProps("rotate")}
            />
            <circle
              cx={box.cx + box.width / 2}
              cy={box.cy + box.height / 2}
              {...handleProps("scale")}
            />
          </g>
          <rect
            x={box.cx - box.width / 2}
            y={box.cy - box.height / 2}
            width={box.width}
            height={box.height}
            transform={selected.rotation ? `rotate(${selected.rotation} ${box.cx} ${box.cy})` : undefined}
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
