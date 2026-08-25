import { describe, expect, it } from "vitest";
import {
  clampLayer,
  createDesign,
  createLayer,
  layerBox,
  MARK_ASPECT,
  MAX_SCALE,
  maxScaleFor,
  MIN_SCALE,
  normaliseRotation,
  parseDesign,
  printableRect,
  reclampDesign,
  type Layer,
} from "./design";

const layer = (overrides: Partial<Layer> = {}): Layer => ({
  id: "layer-1",
  markId: "cognition",
  side: "front",
  x: 0.5,
  y: 0.5,
  scale: 0.4,
  rotation: 0,
  ...overrides,
});

describe("normaliseRotation", () => {
  it("wraps around in both directions", () => {
    expect(normaliseRotation(0)).toBe(0);
    expect(normaliseRotation(360)).toBe(0);
    expect(normaliseRotation(450)).toBe(90);
    expect(normaliseRotation(-90)).toBe(270);
    expect(normaliseRotation(-450)).toBe(270);
  });

  it("falls back to zero for non-finite input", () => {
    expect(normaliseRotation(Number.NaN)).toBe(0);
  });
});

describe("clampLayer", () => {
  it("leaves a centred layer alone", () => {
    const clamped = clampLayer(layer(), "tshirt");
    expect(clamped.x).toBeCloseTo(0.5);
    expect(clamped.y).toBeCloseTo(0.5);
  });

  it("pulls a layer back inside the printable area", () => {
    const clamped = clampLayer(layer({ x: 2, y: -1 }), "tshirt");
    expect(clamped.x).toBeLessThan(1);
    expect(clamped.x).toBeGreaterThan(0.5);
    expect(clamped.y).toBeGreaterThan(0);
    expect(clamped.y).toBeLessThan(0.5);
  });

  it("clamps at the bound exactly, so the artwork's edge touches the edge", () => {
    const clamped = clampLayer(layer({ scale: 0.4, x: 1 }), "tshirt");
    expect(clamped.x).toBeCloseTo(1 - 0.2, 10);
  });

  it("uses the rotated bounding box, not the upright one", () => {
    const upright = clampLayer(layer({ markId: "devin", scale: 0.6, x: 1 }), "tshirt");
    const turned = clampLayer(layer({ markId: "devin", scale: 0.6, x: 1, rotation: 90 }), "tshirt");
    // The wordmark is wide and short: turning it 90° makes it narrow, so it can sit further right.
    expect(turned.x).toBeGreaterThan(upright.x);
    expect(turned.x).toBeLessThanOrEqual(1);
  });

  it("keeps oversized artwork centred rather than pushing it off one edge", () => {
    const clamped = clampLayer(layer({ scale: MAX_SCALE, x: 0.9 }), "cap");
    expect(clamped.x).toBeCloseTo(0.5);
  });

  it("clamps scale into the allowed range and normalises rotation", () => {
    expect(clampLayer(layer({ scale: 99 }), "tshirt").scale).toBe(MAX_SCALE);
    expect(clampLayer(layer({ scale: 0 }), "tshirt").scale).toBe(MIN_SCALE);
    expect(clampLayer(layer({ rotation: 725 }), "tshirt").rotation).toBe(5);
  });
});

describe("maxScaleFor", () => {
  it("is smaller for a tall mark on the short cap area", () => {
    expect(maxScaleFor(layer({ markId: "cognition" }), "cap")).toBeLessThan(
      maxScaleFor(layer({ markId: "cognition" }), "tshirt"),
    );
  });

  it("returns a scale that survives clamping unchanged", () => {
    const scale = maxScaleFor(layer({ markId: "otter" }), "hoodie");
    expect(clampLayer(layer({ markId: "otter", scale }), "hoodie").scale).toBeCloseTo(scale);
  });
});

describe("geometry", () => {
  it("scales with the render size only, never with stored coordinates", () => {
    const small = layerBox(layer(), "tshirt", 320);
    const large = layerBox(layer(), "tshirt", 2000);
    expect(large.cx / small.cx).toBeCloseTo(2000 / 320);
    expect(large.width / small.width).toBeCloseTo(2000 / 320);
  });

  it("derives artwork height from the mark's aspect ratio", () => {
    const box = layerBox(layer({ markId: "devin" }), "tshirt", 800);
    expect(box.height / box.width).toBeCloseTo(MARK_ASPECT.devin);
  });

  it("gives the cap a shorter printable area than the tee", () => {
    expect(printableRect("cap", 800).height).toBeLessThan(printableRect("tshirt", 800).height);
  });
});

describe("createLayer", () => {
  it("places at the centre by default and fits the cap", () => {
    const placed = createLayer("otter", "cap");
    expect(placed.x).toBeCloseTo(0.5);
    expect(placed.scale).toBeLessThanOrEqual(maxScaleFor(placed, "cap"));
  });

  it("clamps a drop near the edge", () => {
    const placed = createLayer("cognition", "tshirt", { x: 0.99, y: 0.01 });
    expect(placed.x).toBeLessThan(0.99);
    expect(placed.y).toBeGreaterThan(0.01);
  });
});

describe("parseDesign", () => {
  it("round-trips a design through JSON", () => {
    const design = createDesign({
      layers: [layer(), layer({ id: "layer-2", markId: "otter", x: 0.4, rotation: 15 })],
    });
    const parsed = parseDesign(JSON.parse(JSON.stringify(design)));
    expect(parsed).toEqual(reclampDesign(design));
  });

  it("re-clamps layers that were stored against a different printable area", () => {
    const parsed = parseDesign({
      id: "d1",
      name: "Chest print",
      garment: "cap",
      colour: "white",
      layers: [{ id: "l1", markId: "otter", x: 0.5, y: 0.95, scale: 0.9, rotation: 0 }],
      updatedAt: "2026-08-24T00:00:00.000Z",
    });
    expect(parsed?.layers[0].y).toBeLessThan(0.95);
  });

  it("rejects malformed input instead of throwing", () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign({ id: "d1", garment: "tshirt", colour: "black" })).toBeNull();
    expect(parseDesign({ id: "d1", garment: "poncho", colour: "black", layers: [] })).toBeNull();
    expect(
      parseDesign({
        id: "d1",
        garment: "tshirt",
        colour: "black",
        layers: [{ markId: "cognition", x: "left", y: 0.5, scale: 0.4, rotation: 0 }],
      }),
    ).toBeNull();
  });

  it("falls back to a name and a timestamp when they are missing", () => {
    const parsed = parseDesign({ id: "d1", garment: "tshirt", colour: "black", layers: [] });
    expect(parsed?.name).toBe("Untitled design");
    expect(Number.isNaN(Date.parse(parsed!.updatedAt))).toBe(false);
  });
});
