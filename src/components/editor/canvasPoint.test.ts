import { describe, expect, it } from "vitest";
import { isInsideRect, pointToFraction } from "./canvasPoint.ts";

const rect = { left: 100, top: 50, width: 400, height: 400 };

describe("pointToFraction", () => {
  it("maps the middle of the canvas to the middle of the printable area", () => {
    // The t-shirt printable area is x .30–.70, y .28–.62 of the canvas.
    const middle = pointToFraction(rect, 100 + 0.5 * 400, 50 + 0.45 * 400, "tshirt");
    expect(middle.x).toBeCloseTo(0.5, 6);
    expect(middle.y).toBeCloseTo(0.5, 6);
  });

  it("returns fractions outside 0..1 above the printable area, for the reducer to clamp", () => {
    const above = pointToFraction(rect, 300, 60, "tshirt");
    expect(above.y).toBeLessThan(0);
  });

  it("knows when a point misses the canvas", () => {
    expect(isInsideRect(rect, 300, 250)).toBe(true);
    expect(isInsideRect(rect, 90, 250)).toBe(false);
  });
});
