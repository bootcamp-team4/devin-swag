import { describe, expect, it } from "vitest";
import {
  MAX_SCALE,
  clampLayer,
  createDesign,
  maxScaleFor,
  type Layer,
} from "../../lib/design.ts";
import { fitDesignToGarment, fitLayerToGarment } from "./fitDesignToGarment.ts";

function layer(overrides: Partial<Layer> = {}): Layer {
  return { id: "l1", markId: "cognition", x: 0.5, y: 0.5, scale: 0.5, rotation: 0, ...overrides };
}

describe("fitDesignToGarment", () => {
  it("returns the same design when the garment does not change", () => {
    const design = createDesign({ garment: "tshirt", layers: [layer()] });
    expect(fitDesignToGarment(design, "tshirt")).toBe(design);
  });

  it("keeps every layer, never dropping artwork", () => {
    const design = createDesign({
      garment: "tshirt",
      layers: [layer({ id: "a", scale: MAX_SCALE }), layer({ id: "b", markId: "otter" })],
    });
    const fitted = fitDesignToGarment(design, "cap");
    expect(fitted.garment).toBe("cap");
    expect(fitted.layers.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("shrinks a layer that no longer fits the smaller printable area", () => {
    const tall = layer({ markId: "otter", scale: MAX_SCALE });
    const design = createDesign({ garment: "tshirt", layers: [tall] });
    const [fitted] = fitDesignToGarment(design, "cap").layers;
    expect(fitted.scale).toBeLessThan(tall.scale);
    expect(fitted.scale).toBeCloseTo(maxScaleFor(tall, "cap"), 10);
  });

  it("leaves a layer that already fits untouched", () => {
    const small = clampLayer(layer({ markId: "devin", scale: 0.3 }), "cap");
    const design = createDesign({ garment: "cap", layers: [small] });
    expect(fitDesignToGarment(design, "tshirt").layers[0]).toEqual(small);
  });

  it("re-clamps a layer near the edge back inside the new printable area", () => {
    const edge = clampLayer(layer({ markId: "devin", scale: 0.6, x: 0.95, y: 0.95 }), "tshirt");
    const design = createDesign({ garment: "tshirt", layers: [edge] });
    const [fitted] = fitDesignToGarment(design, "cap").layers;
    expect(fitted).toEqual(clampLayer({ ...edge, scale: fitted.scale }, "cap"));
    expect(fitted.y).toBeLessThanOrEqual(edge.y);
  });

  it("fits rotated artwork using the rotated bounding box", () => {
    const rotated = layer({ markId: "devin", scale: MAX_SCALE, rotation: 45 });
    const fitted = fitLayerToGarment(rotated, "cap");
    expect(fitted.scale).toBeCloseTo(maxScaleFor(rotated, "cap"), 10);
    expect(fitted).toEqual(clampLayer(fitted, "cap"));
  });

  it("does not mutate the design it is given", () => {
    const design = createDesign({ garment: "tshirt", layers: [layer({ scale: MAX_SCALE })] });
    const snapshot = structuredClone(design);
    fitDesignToGarment(design, "cap");
    expect(design).toEqual(snapshot);
  });
});
