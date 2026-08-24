// Editor state as a reducer, not a bag of setters, so undo/redo stays cheap.
// Pure: no React, no DOM. Every mutation that touches geometry ends in
// clampLayer, so nothing can leave the printable area.
import {
  clampLayer,
  createDesign,
  createLayer,
  newId,
  reclampDesign,
  type Colourway,
  type Design,
  type Garment,
  type Layer,
  type MarkId,
} from "../lib/design.ts";
import { fitDesignToGarment } from "../lib/fitDesignToGarment.ts";

export type EditorState = {
  design: Design;
  /** T6 hangs transform handles off this; null means nothing is selected. */
  selectedLayerId: string | null;
};

export type DesignAction =
  /** Place a mark; `at` is in printable-area fractions, centre when omitted. */
  | { type: "addLayer"; markId: MarkId; at?: { x: number; y: number } }
  /** Absolute move, in printable-area fractions — the drag path. */
  | { type: "moveLayer"; id: string; x: number; y: number }
  /** Relative move, in printable-area fractions — the keyboard path. */
  | { type: "nudgeLayer"; id: string; dx: number; dy: number }
  | { type: "selectLayer"; id: string | null }
  | { type: "deleteLayer"; id: string }
  | { type: "reorderLayer"; id: string; direction: "up" | "down" }
  | { type: "duplicateLayer"; id: string }
  | { type: "setGarment"; garment: Garment }
  | { type: "setColour"; colour: Colourway }
  | { type: "setName"; name: string }
  | { type: "loadDesign"; design: Design };

/** Offset of a duplicate from its original, in printable-area fractions. */
const DUPLICATE_OFFSET = 0.08;

export function initialEditorState(design: Design = createDesign()): EditorState {
  return { design, selectedLayerId: null };
}

function withLayers(state: EditorState, layers: Layer[]): Design {
  return { ...state.design, layers };
}

function mapLayer(state: EditorState, id: string, change: (layer: Layer) => Layer): EditorState {
  const { garment } = state.design;
  let found = false;
  const layers = state.design.layers.map((layer) => {
    if (layer.id !== id) return layer;
    found = true;
    return clampLayer(change(layer), garment);
  });
  if (!found) return state;
  return { ...state, design: withLayers(state, layers) };
}

export function designReducer(state: EditorState, action: DesignAction): EditorState {
  switch (action.type) {
    case "addLayer": {
      const layer = createLayer(action.markId, state.design.garment, action.at);
      return {
        design: withLayers(state, [...state.design.layers, layer]),
        selectedLayerId: layer.id,
      };
    }

    case "moveLayer":
      return mapLayer(state, action.id, (layer) => ({ ...layer, x: action.x, y: action.y }));

    case "nudgeLayer":
      return mapLayer(state, action.id, (layer) => ({
        ...layer,
        x: layer.x + action.dx,
        y: layer.y + action.dy,
      }));

    case "selectLayer": {
      if (action.id !== null && !state.design.layers.some((layer) => layer.id === action.id)) {
        return state;
      }
      return { ...state, selectedLayerId: action.id };
    }

    case "deleteLayer": {
      const layers = state.design.layers.filter((layer) => layer.id !== action.id);
      if (layers.length === state.design.layers.length) return state;
      return {
        design: withLayers(state, layers),
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
      };
    }

    case "reorderLayer": {
      const from = state.design.layers.findIndex((layer) => layer.id === action.id);
      const to = action.direction === "up" ? from + 1 : from - 1;
      if (from === -1 || to < 0 || to >= state.design.layers.length) return state;
      const layers = [...state.design.layers];
      [layers[from], layers[to]] = [layers[to], layers[from]];
      return { ...state, design: withLayers(state, layers) };
    }

    case "duplicateLayer": {
      const index = state.design.layers.findIndex((layer) => layer.id === action.id);
      if (index === -1) return state;
      const original = state.design.layers[index];
      const copy = clampLayer(
        {
          ...original,
          id: newId("layer"),
          x: original.x + DUPLICATE_OFFSET,
          y: original.y + DUPLICATE_OFFSET,
        },
        state.design.garment,
      );
      const layers = [...state.design.layers];
      layers.splice(index + 1, 0, copy);
      return { design: withLayers(state, layers), selectedLayerId: copy.id };
    }

    case "setGarment": {
      if (action.garment === state.design.garment) return state;
      // The cap's printable area is much smaller than the tee's, so artwork is
      // shrunk to fit rather than clamped (which would only slide it inward).
      return { ...state, design: fitDesignToGarment(state.design, action.garment) };
    }

    case "setColour":
      return { ...state, design: { ...state.design, colour: action.colour } };

    case "setName":
      return { ...state, design: { ...state.design, name: action.name } };

    case "loadDesign":
      return { design: reclampDesign(action.design), selectedLayerId: null };
  }
}
