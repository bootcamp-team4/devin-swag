// PNG export. A Design becomes a 2000x2000 mockup of the garment — not a print
// file: the otter is a 400px raster, so print-readiness is deliberately not
// claimed anywhere (see docs/PROJECT_PLAN.md §3.1).
//
// The path is: renderDesign -> toSvgString -> data URI -> Image -> canvas ->
// Blob. Every mark in the scene is already an inlined base64 data URI; an SVG
// rasterised through an Image will not fetch external hrefs, so an external
// reference would silently export a blank garment.
import type { Design, Side } from "./design.ts";
import { renderDesign, toSvgString } from "./render.ts";

export const EXPORT_SIZE = 2000;

/** Flat opaque backdrop, so the mockup does not read as a hole in dark viewers. */
export const EXPORT_BACKGROUND = "#ffffff";

/** True when every mark in the document is inlined; an external href exports blank. */
export function hasOnlyInlinedMarks(svg: string): boolean {
  const hrefs = [...svg.matchAll(/(?:xlink:)?href="([^"]*)"/g)].map((match) => match[1]);
  return hrefs.every((href) => href.startsWith("data:"));
}

function svgToDataUri(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/** "Otter hoodie!" -> "otter-hoodie". Never empty, never a path. */
export function pngFileName(name: string, side: Side = "front"): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${slug || "design"}${side === "front" ? "" : "-back"}.png`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not rasterise the mockup."));
    image.src = src;
  });
}

/** Rasterise a design side into a square PNG blob. */
export async function designToPngBlob(
  design: Design,
  side: Side = "front",
  size: number = EXPORT_SIZE,
): Promise<Blob> {
  const svg = toSvgString(renderDesign(design, size, side));
  if (!hasOnlyInlinedMarks(svg)) {
    throw new Error("Artwork is not inlined, so the mockup would export blank.");
  }

  const image = await loadImage(svgToDataUri(svg));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get a 2D canvas context.");
  context.fillStyle = EXPORT_BACKGROUND;
  context.fillRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode the mockup as a PNG.");
  return blob;
}

/** Rasterise the design and hand the PNG to the browser as a download. */
export async function downloadDesignPng(design: Design, side: Side = "front"): Promise<void> {
  const blob = await designToPngBlob(design, side);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = pngFileName(design.name, side);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick: some browsers cancel a download whose blob URL
  // is released in the same task as the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
