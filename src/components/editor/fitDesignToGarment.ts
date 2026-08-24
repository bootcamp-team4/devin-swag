// Pure helper: move a design onto another garment without losing artwork.
// Lives next to the picker because it is a picker concern — src/lib stays
// unaware of the UI that calls it.
import {
  clampLayer,
  maxScaleFor,
  type Design,
  type Garment,
  type Layer,
} from "../../lib/design.ts";

/** Shrink a layer until it fits the garment, then pull it back inside. */
export function fitLayerToGarment(layer: Layer, garment: Garment): Layer {
  const scale = Math.min(layer.scale, maxScaleFor(layer, garment));
  return clampLayer({ ...layer, scale }, garment);
}

/**
 * Switch a design's garment. The cap's printable area is much smaller than the
 * t-shirt's, so artwork that no longer fits is scaled down rather than cropped
 * or dropped. Coordinates are fractions of the printable area, so a layer that
 * already fits keeps its position.
 */
export function fitDesignToGarment(design: Design, garment: Garment): Design {
  if (design.garment === garment) return design;
  return {
    ...design,
    garment,
    layers: design.layers.map((layer) => fitLayerToGarment(layer, garment)),
  };
}
