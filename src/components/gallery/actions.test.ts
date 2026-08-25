import { describe, expect, it } from "vitest";
import { createDesign, parseDesign, type Design } from "../../lib/design.ts";
import type { DesignStore } from "../../lib/store.ts";
import {
  copyName,
  deleteDesign,
  duplicateDesign,
  listDesigns,
  openInEditor,
  renameDesign,
} from "./actions.ts";

/** A fake store: the same interface, an array instead of localStorage. */
function fakeStore(initial: Design[] = []): DesignStore & { draft: Design | null } {
  let designs = [...initial];
  let draft: Design | null = null;
  const store = {
    list: () =>
      [...designs].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0)),
    get: (id: string) => designs.find((design) => design.id === id) ?? null,
    save: (design: Design) => {
      const stored = { ...design, updatedAt: new Date(Date.now() + designs.length + 1).toISOString() };
      const index = designs.findIndex((existing) => existing.id === stored.id);
      if (index === -1) designs.push(stored);
      else designs[index] = stored;
      return stored;
    },
    remove: (id: string) => {
      designs = designs.filter((design) => design.id !== id);
    },
    loadDraft: () => draft,
    saveDraft: (design: Design | null) => {
      draft = design;
      store.draft = design;
    },
    subscribe: () => () => {},
    draft: null as Design | null,
  };
  return store;
}

function seed(name: string, updatedAt: string): Design {
  return createDesign({
    name,
    updatedAt,
    layers: [{ id: `${name}-l1`, markId: "devin", side: "front", x: 0.5, y: 0.5, scale: 0.4, rotation: 0 }],
  });
}

describe("gallery actions", () => {
  it("lists saved designs newest first", () => {
    const older = seed("Older", "2026-01-01T00:00:00.000Z");
    const newer = seed("Newer", "2026-06-01T00:00:00.000Z");
    const store = fakeStore([older, newer]);

    expect(listDesigns(store).map((design) => design.name)).toEqual(["Newer", "Older"]);
  });

  it("renames a design, trimming whitespace", () => {
    const design = seed("Old name", "2026-01-01T00:00:00.000Z");
    const store = fakeStore([design]);

    const renamed = renameDesign(store, design.id, "  New name  ");

    expect(renamed?.name).toBe("New name");
    expect(store.get(design.id)?.name).toBe("New name");
  });

  it("ignores an empty rename and an unknown id", () => {
    const design = seed("Keep me", "2026-01-01T00:00:00.000Z");
    const store = fakeStore([design]);

    expect(renameDesign(store, design.id, "   ")?.name).toBe("Keep me");
    expect(renameDesign(store, "missing", "Whatever")).toBeNull();
    expect(store.list()).toHaveLength(1);
  });

  it("duplicates a design as a new record with its own id and a distinct name", () => {
    const design = seed("Tee", "2026-01-01T00:00:00.000Z");
    const store = fakeStore([design]);

    const copy = duplicateDesign(store, design.id);

    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(design.id);
    expect(copy?.name).toBe("Tee (copy)");
    expect(copy?.layers).toEqual(design.layers);
    expect(store.list()).toHaveLength(2);

    expect(duplicateDesign(store, design.id)?.name).toBe("Tee (copy 2)");
  });

  it("numbers repeated copies without stacking suffixes", () => {
    expect(copyName("Tee", [])).toBe("Tee (copy)");
    expect(copyName("Tee (copy)", ["Tee (copy)"])).toBe("Tee (copy 2)");
    expect(copyName("Tee (copy 2)", ["Tee (copy)", "Tee (copy 2)"])).toBe("Tee (copy 3)");
  });

  it("deletes a design and leaves the others alone", () => {
    const keep = seed("Keep", "2026-01-01T00:00:00.000Z");
    const drop = seed("Drop", "2026-02-01T00:00:00.000Z");
    const store = fakeStore([keep, drop]);

    deleteDesign(store, drop.id);

    expect(store.list().map((design) => design.name)).toEqual(["Keep"]);
  });

  it("opens a design by handing it to the editor's draft slot, id intact", () => {
    const design = seed("Tee", "2026-01-01T00:00:00.000Z");
    const store = fakeStore([design]);

    const opened = openInEditor(store, design.id);

    expect(opened?.id).toBe(design.id);
    expect(store.loadDraft()?.id).toBe(design.id);
    expect(openInEditor(store, "missing")).toBeNull();
  });

  it("a corrupt record is dropped rather than taking out the list", () => {
    const good = seed("Good", "2026-01-01T00:00:00.000Z");
    const parsed = [{ id: "bad", garment: "sock" }, good].map(parseDesign);
    const store = fakeStore(parsed.filter((design): design is Design => design !== null));

    expect(parsed[0]).toBeNull();
    expect(listDesigns(store).map((design) => design.name)).toEqual(["Good"]);
  });
});
