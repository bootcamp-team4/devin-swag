// The one pixels-to-fractions conversion in the interaction layer: a client
// point over the canvas becomes printable-area fractions, which is the only
// coordinate system the reducer and src/lib understand.
import { PRINTABLE_AREAS, type Garment } from "../../lib/design.ts";

export type ClientRectLike = { left: number; top: number; width: number; height: number };

export function pointToFraction(
  rect: ClientRectLike,
  clientX: number,
  clientY: number,
  garment: Garment,
): { x: number; y: number } {
  const area = PRINTABLE_AREAS[garment];
  const u = (clientX - rect.left) / rect.width;
  const v = (clientY - rect.top) / rect.height;
  return {
    x: (u - area.x0) / (area.x1 - area.x0),
    y: (v - area.y0) / (area.y1 - area.y0),
  };
}

export function isInsideRect(rect: ClientRectLike, clientX: number, clientY: number): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.left + rect.width &&
    clientY >= rect.top &&
    clientY <= rect.top + rect.height
  );
}
