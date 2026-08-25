// Gallery behaviour, kept out of the component so it is testable against any
// DesignStore — the real localStorage one or a fake. No React, no DOM.

import { createDesign, type Design } from "../../lib/design.ts";
import type { DesignStore } from "../../lib/store.ts";

/** Saved designs, newest first. Corrupt entries are already dropped by the store. */
export function listDesigns(store: DesignStore): Promise<Design[]> {
  return store.list();
}

export async function renameDesign(
  store: DesignStore,
  id: string,
  name: string,
): Promise<Design | null> {
  const design = await store.get(id);
  if (!design) return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed === design.name) return design;
  return store.save({ ...design, name: trimmed });
}

/** "Name" → "Name (copy)", "Name (copy)" → "Name (copy 2)", and so on. */
export function copyName(name: string, existing: readonly string[]): string {
  const base = name.replace(/ \(copy( \d+)?\)$/, "");
  let candidate = `${base} (copy)`;
  let n = 2;
  while (existing.includes(candidate)) {
    candidate = `${base} (copy ${n})`;
    n += 1;
  }
  return candidate;
}

export async function duplicateDesign(store: DesignStore, id: string): Promise<Design | null> {
  const design = await store.get(id);
  if (!design) return null;
  const existing = await store.list();
  const copy = createDesign({
    name: copyName(
      design.name,
      existing.map((entry) => entry.name),
    ),
    garment: design.garment,
    colour: design.colour,
    layers: design.layers.map((layer) => ({ ...layer })),
  });
  return store.save(copy);
}

export function deleteDesign(store: DesignStore, id: string): Promise<void> {
  return store.remove(id);
}

/**
 * The "open in the editor" seam. The editor restores the autosaved draft on
 * load, so handing a design over means writing it to the draft slot and
 * navigating to `/` — no route param, and no change to EditorRoute, which T5
 * owns. The draft keeps the design's id, so saving in the editor upserts the
 * same record rather than creating a second one.
 */
export async function openInEditor(store: DesignStore, id: string): Promise<Design | null> {
  const design = await store.get(id);
  if (!design) return null;
  store.saveDraft(design);
  return design;
}
