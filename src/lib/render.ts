// The renderer. Turns a Design into a Scene (plain data), plus two adapters:
// toReactSvg for the editor and gallery thumbnails, toSvgString for export.
//
// Geometry is never re-derived here: layer boxes come from design.ts. Garment
// paths live on a UNIT square and are placed with a single uniform scale, so
// the same design renders identically at 320, 800 and 2000 pixels.
import { createElement as h, type ReactElement } from "react";
import {
  GARMENT_LABELS,
  MARK_LABELS,
  layerBox,
  printableRect,
  type Colourway,
  type Design,
  type Garment,
  type Layer,
  type MarkId,
  type Side,
} from "./design.ts";
import { GARMENT_PARTS, UNIT, type GarmentPart } from "./garment-paths.ts";
import {
  INK_TOKEN,
  MARK_COGNITION_SVG,
  MARK_DEVIN_ON_BLACK_PNG,
  MARK_DEVIN_ON_WHITE_PNG,
  MARK_OTTER_PNG,
} from "../brand/marks.ts";

export type Palette = {
  /** The blank itself. */
  body: string;
  /** Silhouette outline — the white blank needs one to read at all. */
  outline: string;
  /** Seams, collar, pocket. */
  seam: string;
  /** Artwork ink: white on a black garment, black on a white one. */
  ink: string;
};

export const PALETTES: Record<Colourway, Palette> = {
  black: { body: "#141414", outline: "#3f3f46", seam: "#5b5b66", ink: "#ffffff" },
  white: { body: "#fafafa", outline: "#18181b", seam: "#a1a1aa", ink: "#0a0a0a" },
};

export type ScenePath = {
  kind: "path";
  id: string;
  /** Path data in UNIT-square coordinates; multiply by Scene.unitScale. */
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
};

export type SceneMark = {
  kind: "mark";
  layerId: string;
  markId: MarkId;
  /** Always a data URI. An external href silently exports a blank garment. */
  href: string;
  /** Un-rotated box, in pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** Rotation centre, in pixels. */
  cx: number;
  cy: number;
  label: string;
};

export type SceneRect = { x: number; y: number; width: number; height: number };

export type Scene = {
  size: number;
  garment: Garment;
  colour: Colourway;
  palette: Palette;
  /** Uniform factor from UNIT-square coordinates to pixels. */
  unitScale: number;
  parts: ScenePath[];
  marks: SceneMark[];
  /** Printable area in pixels — outlined on the contact sheet. */
  printable: SceneRect;
  /** Accessible description of the whole mockup. */
  title: string;
};

function markHref(markId: MarkId, colour: Colourway, ink: string): string {
  if (markId === "otter") return MARK_OTTER_PNG;
  // The Devin lockup is full colour, so it ships as two artworks rather than
  // one inked silhouette: the wordmark flips, the hexagons do not.
  if (markId === "devin") {
    return colour === "black" ? MARK_DEVIN_ON_BLACK_PNG : MARK_DEVIN_ON_WHITE_PNG;
  }
  return svgDataUri(MARK_COGNITION_SVG.replaceAll(INK_TOKEN, ink));
}

function svgDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function partToPath(part: GarmentPart, palette: Palette): ScenePath {
  const isBody = part.role === "body";
  return {
    kind: "path",
    id: part.id,
    d: part.d,
    fill: isBody ? palette.body : "none",
    stroke: isBody ? palette.outline : palette.seam,
    strokeWidth: isBody ? 7 : 5,
    opacity: part.opacity ?? 1,
  };
}

function markToScene(layer: Layer, design: Design, size: number, ink: string): SceneMark {
  const box = layerBox(layer, design.garment, size);
  return {
    kind: "mark",
    layerId: layer.id,
    markId: layer.markId,
    href: markHref(layer.markId, design.colour, ink),
    x: box.cx - box.width / 2,
    y: box.cy - box.height / 2,
    width: box.width,
    height: box.height,
    rotation: layer.rotation,
    cx: box.cx,
    cy: box.cy,
    label: MARK_LABELS[layer.markId],
  };
}

const PLACEMENT: Record<Garment, Record<Side, string>> = {
  tshirt: { front: "on the front chest", back: "on the back" },
  hoodie: { front: "on the front chest", back: "on the back" },
  cap: { front: "on the front panel", back: "on the back" },
};

/** "Black t-shirt with the Devin logo on the front chest". */
export function describeDesign(design: Design, side: Side = "front"): string {
  const blank = `${design.colour === "black" ? "Black" : "White"} ${GARMENT_LABELS[
    design.garment
  ].toLowerCase()}`;
  const sideLayers = design.layers.filter((layer) => layer.side === side);
  if (sideLayers.length === 0) return `Blank ${blank.toLowerCase()}`;
  const names = sideLayers.map((layer) => `the ${MARK_LABELS[layer.markId]}`);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${blank} with ${list} ${PLACEMENT[design.garment][side]}`;
}

/** The whole renderer: a design plus a pixel size in, plain scene data out. */
export function renderDesign(design: Design, size: number, side: Side = "front"): Scene {
  const palette = PALETTES[design.colour];
  const sideLayers = design.layers.filter((layer) => layer.side === side);
  return {
    size,
    garment: design.garment,
    colour: design.colour,
    palette,
    unitScale: size / UNIT,
    parts: GARMENT_PARTS[design.garment].map((part) => partToPath(part, palette)),
    // z-order is array order, so the scene keeps it: last mark paints last.
    marks: sideLayers.map((layer) => markToScene(layer, design, size, palette.ink)),
    printable: printableRect(design.garment, size),
    title: describeDesign(design, side),
  };
}

export type ReactSvgOptions = {
  /** Outline the printable area — the contact sheet approval gate. */
  showPrintableArea?: boolean;
  /** Extra props per mark node, so the editor can attach refs and handlers. */
  markProps?: (mark: SceneMark) => Record<string, unknown>;
  className?: string;
};

function transformFor(mark: SceneMark): string | undefined {
  if (mark.rotation === 0) return undefined;
  return `rotate(${mark.rotation} ${mark.cx} ${mark.cy})`;
}

/**
 * Real React elements — not markup — so the editor can attach refs, focus and
 * pointer handlers, and gallery thumbnails can reuse the same code path.
 */
export function toReactSvg(scene: Scene, options: ReactSvgOptions = {}): ReactElement {
  const parts = scene.parts.map((part) =>
    h("path", {
      key: `part-${part.id}`,
      d: part.d,
      fill: part.fill,
      stroke: part.stroke,
      strokeWidth: part.strokeWidth,
      strokeLinejoin: "round",
      strokeLinecap: "round",
      opacity: part.opacity,
    }),
  );

  const marks = scene.marks.map((mark) =>
    h("image", {
      key: mark.layerId,
      "data-layer-id": mark.layerId,
      href: mark.href,
      x: mark.x,
      y: mark.y,
      width: mark.width,
      height: mark.height,
      transform: transformFor(mark),
      preserveAspectRatio: "xMidYMid meet",
      ...(options.markProps?.(mark) ?? {}),
    }),
  );

  const children: ReactElement[] = [
    h("title", { key: "title" }, scene.title),
    h(
      "g",
      { key: "garment", transform: `scale(${scene.unitScale})` },
      ...parts,
    ),
  ];
  if (options.showPrintableArea) {
    children.push(
      h("rect", {
        key: "printable",
        x: scene.printable.x,
        y: scene.printable.y,
        width: scene.printable.width,
        height: scene.printable.height,
        fill: "none",
        stroke: "#e78c3b",
        strokeWidth: Math.max(1, scene.size / 300),
        strokeDasharray: `${scene.size / 60} ${scene.size / 90}`,
      }),
    );
  }
  children.push(h("g", { key: "marks" }, ...marks));

  return h(
    "svg",
    {
      viewBox: `0 0 ${scene.size} ${scene.size}`,
      width: scene.size,
      height: scene.size,
      role: "img",
      "aria-label": scene.title,
      className: options.className,
      xmlns: "http://www.w3.org/2000/svg",
    },
    ...children,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function attrs(pairs: Record<string, string | number | undefined>): string {
  return Object.entries(pairs)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}="${escapeXml(String(value))}"`)
    .join(" ");
}

/** A standalone SVG document for the PNG export path. */
export function toSvgString(scene: Scene): string {
  const parts = scene.parts
    .map((part) =>
      `<path ${attrs({
        d: part.d,
        fill: part.fill,
        stroke: part.stroke,
        "stroke-width": part.strokeWidth,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        opacity: part.opacity,
      })}/>`,
    )
    .join("");
  const marks = scene.marks
    .map((mark) =>
      `<image ${attrs({
        "data-layer-id": mark.layerId,
        href: mark.href,
        x: mark.x,
        y: mark.y,
        width: mark.width,
        height: mark.height,
        transform: transformFor(mark),
        preserveAspectRatio: "xMidYMid meet",
      })}/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${scene.size} ${scene.size}" width="${scene.size}" height="${scene.size}">` +
    `<title>${escapeXml(scene.title)}</title>` +
    `<g transform="scale(${scene.unitScale})">${parts}</g>` +
    `<g>${marks}</g>` +
    `</svg>`
  );
}
