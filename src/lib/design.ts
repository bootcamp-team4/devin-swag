// The design model. Pure: no React, no DOM, no imports from src/components or src/routes.

export const GARMENTS = ["tshirt", "hoodie", "cap"] as const;
export const COLOURWAYS = ["black", "white"] as const;
export const MARK_IDS = ["cognition", "devin", "otter"] as const;
export const SIDES = ["front", "back"] as const;

export type Garment = (typeof GARMENTS)[number];
export type Colourway = (typeof COLOURWAYS)[number];
export type MarkId = (typeof MARK_IDS)[number];
export type Side = (typeof SIDES)[number];

export type Layer = {
  id: string;
  markId: MarkId;
  side: Side;
  /** Centre of the artwork, as a fraction of the printable area. Never pixels. */
  x: number;
  y: number;
  /** Artwork width as a fraction of the printable area's width. */
  scale: number;
  /** Degrees clockwise, always normalised into [0, 360). */
  rotation: number;
};

export type Design = {
  id: string;
  name: string;
  garment: Garment;
  colour: Colourway;
  /** z-order = array order; the last layer is on top. */
  layers: Layer[];
  updatedAt: string;
};

/** A rectangle in fractions of the garment's square canvas. */
export type Rect = { x0: number; y0: number; x1: number; y1: number };

/**
 * Printable areas, approved by eye from the T3 contact sheet. Changing one of
 * these moves the artwork of every design already saved — normalised
 * coordinates mean there is nothing to migrate.
 */
export const PRINTABLE_AREAS: Record<Garment, Rect> = {
  tshirt: { x0: 0.3, y0: 0.28, x1: 0.7, y1: 0.62 },
  hoodie: { x0: 0.3, y0: 0.26, x1: 0.7, y1: 0.52 },
  cap: { x0: 0.34, y0: 0.4, x1: 0.66, y1: 0.58 },
};

/** Intrinsic height ÷ width of each mark's artwork. */
export const MARK_ASPECT: Record<MarkId, number> = {
  cognition: 1,
  devin: 183 / 531,
  otter: 1,
};

export const MIN_SCALE = 0.08;
export const MAX_SCALE = 1;
export const DEFAULT_SCALE = 0.45;

export const GARMENT_LABELS: Record<Garment, string> = {
  tshirt: "T-shirt",
  hoodie: "Hoodie",
  cap: "Cap",
};

export const MARK_LABELS: Record<MarkId, string> = {
  cognition: "Cognition logo",
  devin: "Devin logo",
  otter: "Otter mascot",
};

export function printableRect(garment: Garment, size: number) {
  const area = PRINTABLE_AREAS[garment];
  return {
    x: area.x0 * size,
    y: area.y0 * size,
    width: (area.x1 - area.x0) * size,
    height: (area.y1 - area.y0) * size,
  };
}

/** The artwork's un-rotated box in pixels, at a given render size. */
export function layerBox(layer: Layer, garment: Garment, size: number) {
  const area = printableRect(garment, size);
  const width = layer.scale * area.width;
  const height = width * MARK_ASPECT[layer.markId];
  return {
    width,
    height,
    cx: area.x + layer.x * area.width,
    cy: area.y + layer.y * area.height,
  };
}

export function normaliseRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Half-extents of the artwork's *rotated* bounding box, in printable-area
 * fractions. Clamping the un-rotated box instead lets rotated artwork hang
 * over the edge of the printable area.
 */
function halfExtents(layer: Layer, garment: Garment) {
  const area = PRINTABLE_AREAS[garment];
  const aspectRatio = (area.y1 - area.y0) / (area.x1 - area.x0);
  const radians = (normaliseRotation(layer.rotation) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  // Work in units of printable width, then convert the vertical extent.
  const width = layer.scale;
  const height = layer.scale * MARK_ASPECT[layer.markId];
  return {
    x: (width * cos + height * sin) / 2,
    y: (width * sin + height * cos) / 2 / aspectRatio,
  };
}

/** Pull a layer back inside the printable area and the scale limits. */
export function clampLayer(layer: Layer, garment: Garment): Layer {
  const rotation = normaliseRotation(layer.rotation);
  const scale = clamp(layer.scale, MIN_SCALE, MAX_SCALE);
  const extents = halfExtents({ ...layer, rotation, scale }, garment);
  const limitX = Math.min(extents.x, 0.5);
  const limitY = Math.min(extents.y, 0.5);
  return {
    ...layer,
    rotation,
    scale,
    x: clamp(layer.x, limitX, 1 - limitX),
    y: clamp(layer.y, limitY, 1 - limitY),
  };
}

/** The largest scale at which the artwork still fits the printable area. */
export function maxScaleFor(layer: Layer, garment: Garment): number {
  const unit = halfExtents({ ...layer, scale: 1 }, garment);
  const limit = Math.min(0.5 / unit.x, 0.5 / unit.y);
  return clamp(limit, MIN_SCALE, MAX_SCALE);
}

let idCounter = 0;

export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createLayer(
  markId: MarkId,
  garment: Garment,
  at?: { x: number; y: number },
  side: Side = "front",
): Layer {
  const layer: Layer = {
    id: newId("layer"),
    markId,
    side,
    x: at?.x ?? 0.5,
    y: at?.y ?? 0.5,
    scale: Math.min(DEFAULT_SCALE, maxScaleFor({ scale: DEFAULT_SCALE, markId, side, rotation: 0 } as Layer, garment)),
    rotation: 0,
  };
  return clampLayer(layer, garment);
}

export function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: newId("design"),
    name: "Untitled design",
    garment: "tshirt",
    colour: "black",
    layers: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Re-clamp every layer, e.g. after switching to a garment with a smaller printable area. */
export function reclampDesign(design: Design): Design {
  return { ...design, layers: design.layers.map((layer) => clampLayer(layer, design.garment)) };
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseLayer(value: unknown): Layer | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (!isOneOf(MARK_IDS, raw.markId)) return null;
  if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return null;
  if (!isFiniteNumber(raw.scale) || !isFiniteNumber(raw.rotation)) return null;
  return {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : newId("layer"),
    markId: raw.markId,
    side: isOneOf(SIDES, raw.side) ? raw.side : "front",
    x: raw.x,
    y: raw.y,
    scale: raw.scale,
    rotation: raw.rotation,
  };
}

/**
 * Validate anything that claims to be a design — parsed JSON from
 * localStorage, a share link, a fixture. Returns null rather than throwing so
 * one corrupt entry cannot take out the gallery.
 */
export function parseDesign(value: unknown): Design | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || raw.id.length === 0) return null;
  if (!isOneOf(GARMENTS, raw.garment) || !isOneOf(COLOURWAYS, raw.colour)) return null;
  if (!Array.isArray(raw.layers)) return null;
  const layers: Layer[] = [];
  for (const entry of raw.layers) {
    const layer = parseLayer(entry);
    if (!layer) return null;
    layers.push(layer);
  }
  const design: Design = {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name : "Untitled design",
    garment: raw.garment,
    colour: raw.colour,
    layers,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
  return reclampDesign(design);
}
