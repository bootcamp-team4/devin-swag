import { describe, expect, it } from "vitest";
import {
  MARK_ASPECT,
  PRINTABLE_AREAS,
  createDesign,
  type Design,
  type Layer,
} from "../lib/design.ts";
import {
  designReducer,
  initialEditorState,
  type DesignAction,
  type EditorState,
} from "./designReducer.ts";

function run(state: EditorState, ...actions: DesignAction[]): EditorState {
  return actions.reduce(designReducer, state);
}

function withLayer(layer: Partial<Layer> = {}, design: Partial<Design> = {}): EditorState {
  const full: Layer = { id: "l1", markId: "cognition", x: 0.5, y: 0.5, scale: 0.4, rotation: 0, ...layer };
  return { design: createDesign({ layers: [full], ...design }), selectedLayerId: "l1" };
}

/** How far a layer's centre can travel before its box leaves the printable area. */
function limits(layer: Layer, garment: Design["garment"]) {
  const area = PRINTABLE_AREAS[garment];
  const aspect = (area.y1 - area.y0) / (area.x1 - area.x0);
  return { x: layer.scale / 2, y: (layer.scale * MARK_ASPECT[layer.markId]) / 2 / aspect };
}

describe("designReducer", () => {
  it("places a mark at the centre of the printable area by default", () => {
    const state = run(initialEditorState(), { type: "addLayer", markId: "devin" });
    expect(state.design.layers).toHaveLength(1);
    expect(state.design.layers[0]).toMatchObject({ markId: "devin", x: 0.5, y: 0.5 });
    expect(state.selectedLayerId).toBe(state.design.layers[0].id);
  });

  it("clamps a placement dropped outside the printable area", () => {
    const state = run(initialEditorState(), {
      type: "addLayer",
      markId: "cognition",
      at: { x: 1.8, y: -0.6 },
    });
    const layer = state.design.layers[0];
    const limit = limits(layer, state.design.garment);
    expect(layer.x).toBeCloseTo(1 - limit.x, 6);
    expect(layer.y).toBeCloseTo(limit.y, 6);
  });

  it("clamps a move mid-drag, not only on drop", () => {
    const state = run(withLayer(), { type: "moveLayer", id: "l1", x: 5, y: 5 });
    const layer = state.design.layers[0];
    const limit = limits(layer, state.design.garment);
    expect(layer.x).toBeCloseTo(1 - limit.x, 6);
    expect(layer.y).toBeCloseTo(1 - limit.y, 6);
  });

  it("stops nudging at the boundary instead of drifting past it", () => {
    let state = withLayer({ x: 0.2 });
    for (let i = 0; i < 40; i += 1) {
      state = designReducer(state, { type: "nudgeLayer", id: "l1", dx: -0.05, dy: 0 });
    }
    const layer = state.design.layers[0];
    expect(layer.x).toBeCloseTo(limits(layer, state.design.garment).x, 6);
    expect(layer.y).toBe(0.5);
  });

  it("selects, deselects, and ignores unknown ids", () => {
    const state = withLayer();
    expect(designReducer(state, { type: "selectLayer", id: null }).selectedLayerId).toBeNull();
    expect(designReducer(state, { type: "selectLayer", id: "nope" }).selectedLayerId).toBe("l1");
  });

  it("clears the selection when the selected layer is deleted", () => {
    const state = run(withLayer(), { type: "deleteLayer", id: "l1" });
    expect(state.design.layers).toHaveLength(0);
    expect(state.selectedLayerId).toBeNull();
  });

  it("reorders within bounds and is a no-op at the ends", () => {
    const base: EditorState = {
      design: createDesign({
        layers: [
          { id: "a", markId: "devin", x: 0.5, y: 0.5, scale: 0.3, rotation: 0 },
          { id: "b", markId: "otter", x: 0.5, y: 0.5, scale: 0.3, rotation: 0 },
        ],
      }),
      selectedLayerId: null,
    };
    const up = designReducer(base, { type: "reorderLayer", id: "a", direction: "up" });
    expect(up.design.layers.map((layer) => layer.id)).toEqual(["b", "a"]);
    expect(designReducer(base, { type: "reorderLayer", id: "a", direction: "down" })).toBe(base);
  });

  it("duplicates a layer above the original, offset and clamped", () => {
    const state = run(withLayer(), { type: "duplicateLayer", id: "l1" });
    const [original, copy] = state.design.layers;
    expect(state.design.layers).toHaveLength(2);
    expect(copy.id).not.toBe(original.id);
    expect(copy.markId).toBe(original.markId);
    expect(copy.x).toBeGreaterThan(original.x);
    expect(state.selectedLayerId).toBe(copy.id);
  });

  it("re-clamps every layer when the garment changes to a smaller area", () => {
    const state = run(withLayer({ y: 0.95, scale: 0.3 }), { type: "setGarment", garment: "cap" });
    const layer = state.design.layers[0];
    expect(state.design.garment).toBe("cap");
    expect(layer.y).toBeCloseTo(1 - limits(layer, "cap").y, 6);
  });

  it("sets the colour and loads a design, re-clamping and dropping the selection", () => {
    const coloured = run(withLayer(), { type: "setColour", colour: "white" });
    expect(coloured.design.colour).toBe("white");

    const loaded = designReducer(coloured, {
      type: "loadDesign",
      design: createDesign({
        garment: "cap",
        layers: [{ id: "x", markId: "otter", x: 3, y: 0.5, scale: 0.5, rotation: 0 }],
      }),
    });
    expect(loaded.selectedLayerId).toBeNull();
    expect(loaded.design.layers[0].x).toBeLessThan(1);
  });
});
