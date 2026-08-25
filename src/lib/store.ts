// Persistence seam. The only module in src/lib allowed to know localStorage
// exists, and the only one with a DOM dependency (the `storage` event). No
// React, no imports from src/components or src/routes.

import { parseDesign, type Design } from "./design";

export interface DesignStore {
  /** Saved designs, newest `updatedAt` first. */
  list(): Design[];
  get(id: string): Design | null;
  /** Upsert by id; stamps `updatedAt` and returns the stored design. */
  save(design: Design): Design;
  remove(id: string): void;
  /** The in-progress design, autosaved separately from the named designs. */
  loadDraft(): Design | null;
  saveDraft(design: Design | null): void;
  /** Called after any local write and on another tab's `storage` event. */
  subscribe(listener: () => void): () => void;
}

/** The `getItem`/`setItem`/`removeItem` subset of `Storage` we depend on. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DESIGNS_KEY = "cognition-merch-designer:designs";
export const DRAFT_KEY = "cognition-merch-designer:draft";

/**
 * Payload version. Bump when the shape *around* the designs changes, and add a
 * branch to `readPayload`: it upgrades what it recognises and returns an empty
 * payload for anything it does not, so an unknown (newer, or corrupt) version
 * degrades to "no saved designs" instead of crashing the gallery. Design-level
 * changes need no bump — `parseDesign` validates and re-clamps every entry, and
 * layer coordinates are normalised so geometry never migrates.
 */
export const STORAGE_VERSION = 1;

type Payload = { version: number; designs: unknown[] };

/** Thrown by `save` when the backing store is full, so the UI can say so. */
export class StorageQuotaError extends Error {
  constructor(cause?: unknown) {
    super("Storage is full — delete a design and try again.");
    this.name = "StorageQuotaError";
    this.cause = cause;
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function defaultBacking(): StorageLike {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Access itself throws when cookies/site data are blocked.
  }
  return memoryStorage();
}

function readJson(backing: StorageLike, key: string): unknown {
  let raw: string | null;
  try {
    raw = backing.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function byNewest(a: Design, b: Design): number {
  return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
}

export function createLocalDesignStore(backing: StorageLike = defaultBacking()): DesignStore {
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  /** Read the payload, tolerating absent, corrupt, and unknown-version data. */
  const readPayload = (): Payload => {
    const value = readJson(backing, DESIGNS_KEY);
    if (typeof value !== "object" || value === null) return { version: STORAGE_VERSION, designs: [] };
    const raw = value as Record<string, unknown>;
    if (raw.version !== STORAGE_VERSION || !Array.isArray(raw.designs)) {
      // Future versions: add `if (raw.version === 1) return upgradeV1(raw);`.
      return { version: STORAGE_VERSION, designs: [] };
    }
    return { version: STORAGE_VERSION, designs: raw.designs };
  };

  /** Every read goes through `parseDesign`; corrupt entries are dropped. */
  const readDesigns = (): Design[] => {
    const designs: Design[] = [];
    for (const entry of readPayload().designs) {
      const design = parseDesign(entry);
      if (design) designs.push(design);
    }
    return designs;
  };

  const writeDesigns = (designs: Design[]): void => {
    const payload: Payload = { version: STORAGE_VERSION, designs };
    try {
      backing.setItem(DESIGNS_KEY, JSON.stringify(payload));
    } catch (error) {
      if (isQuotaError(error)) throw new StorageQuotaError(error);
      throw error;
    }
  };

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key === null || event.key === DESIGNS_KEY || event.key === DRAFT_KEY) notify();
    });
  }

  return {
    list() {
      return readDesigns().sort(byNewest);
    },

    get(id) {
      return readDesigns().find((design) => design.id === id) ?? null;
    },

    save(design) {
      const stored: Design = { ...design, updatedAt: new Date().toISOString() };
      const designs = readDesigns();
      const index = designs.findIndex((existing) => existing.id === stored.id);
      if (index === -1) designs.push(stored);
      else designs[index] = stored;
      writeDesigns(designs.sort(byNewest));
      notify();
      return stored;
    },

    remove(id) {
      const designs = readDesigns();
      const kept = designs.filter((design) => design.id !== id);
      if (kept.length === designs.length) return;
      writeDesigns(kept);
      notify();
    },

    loadDraft() {
      return parseDesign(readJson(backing, DRAFT_KEY));
    },

    saveDraft(design) {
      try {
        if (design === null) backing.removeItem(DRAFT_KEY);
        else backing.setItem(DRAFT_KEY, JSON.stringify(design));
      } catch (error) {
        if (isQuotaError(error)) throw new StorageQuotaError(error);
        throw error;
      }
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
