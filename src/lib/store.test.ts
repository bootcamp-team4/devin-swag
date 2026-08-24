import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDesign, type Design } from "./design";
import {
  createLocalDesignStore,
  DESIGNS_KEY,
  DRAFT_KEY,
  STORAGE_VERSION,
  StorageQuotaError,
  type StorageLike,
} from "./store";

class FakeStorage implements StorageLike {
  readonly map = new Map<string, string>();
  /** Set to make the next writes fail the way a full localStorage does. */
  full = false;

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.full) {
      const error = new Error("quota");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const design = (overrides: Partial<Design> = {}): Design =>
  createDesign({ layers: [{ id: "layer-1", markId: "cognition", x: 0.5, y: 0.5, scale: 0.4, rotation: 0 }], ...overrides });

const seed = (backing: FakeStorage, designs: unknown[], version: number = STORAGE_VERSION) => {
  backing.map.set(DESIGNS_KEY, JSON.stringify({ version, designs }));
};

let backing: FakeStorage;

beforeEach(() => {
  backing = new FakeStorage();
  vi.useRealTimers();
});

describe("save", () => {
  it("stamps updatedAt rather than trusting the caller", () => {
    const store = createLocalDesignStore(backing);
    const saved = store.save(design({ updatedAt: "1999-01-01T00:00:00.000Z" }));
    expect(saved.updatedAt).not.toBe("1999-01-01T00:00:00.000Z");
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse("2020-01-01T00:00:00.000Z"));
    expect(store.get(saved.id)?.updatedAt).toBe(saved.updatedAt);
  });

  it("upserts by id instead of appending a duplicate", () => {
    const store = createLocalDesignStore(backing);
    const first = store.save(design({ name: "Original" }));
    const second = store.save({ ...first, name: "Renamed" });
    expect(second.id).toBe(first.id);
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].name).toBe("Renamed");
  });

  it("writes a versioned payload under one namespaced key", () => {
    const store = createLocalDesignStore(backing);
    store.save(design());
    const payload = JSON.parse(backing.map.get(DESIGNS_KEY) as string) as { version: number; designs: unknown[] };
    expect(payload.version).toBe(STORAGE_VERSION);
    expect(payload.designs).toHaveLength(1);
    expect([...backing.map.keys()]).toEqual([DESIGNS_KEY]);
  });

  it("surfaces a full backing store as a catchable StorageQuotaError", () => {
    const store = createLocalDesignStore(backing);
    backing.full = true;
    expect(() => store.save(design())).toThrow(StorageQuotaError);
    backing.full = false;
    expect(store.list()).toEqual([]);
  });

  it("rethrows failures that are not about quota", () => {
    const store = createLocalDesignStore(backing);
    backing.setItem = () => {
      throw new TypeError("nope");
    };
    expect(() => store.save(design())).toThrow(TypeError);
  });
});

describe("list", () => {
  it("returns designs newest updatedAt first", () => {
    seed(backing, [
      design({ id: "a", updatedAt: "2026-01-01T00:00:00.000Z" }),
      design({ id: "c", updatedAt: "2026-03-01T00:00:00.000Z" }),
      design({ id: "b", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ]);
    const store = createLocalDesignStore(backing);
    expect(store.list().map((entry) => entry.id)).toEqual(["c", "b", "a"]);
  });

  it("is empty when nothing has ever been saved", () => {
    expect(createLocalDesignStore(backing).list()).toEqual([]);
  });

  it("drops one corrupt entry rather than losing the gallery", () => {
    seed(backing, [design({ id: "good" }), { id: "bad", garment: "tarpaulin" }, null, 42]);
    const store = createLocalDesignStore(backing);
    expect(store.list().map((entry) => entry.id)).toEqual(["good"]);
  });

  it("tolerates a garbage blob under the key", () => {
    backing.map.set(DESIGNS_KEY, "{not json at all");
    expect(createLocalDesignStore(backing).list()).toEqual([]);
  });

  it("tolerates an unknown payload version", () => {
    seed(backing, [design({ id: "future" })], STORAGE_VERSION + 99);
    const store = createLocalDesignStore(backing);
    expect(store.list()).toEqual([]);
    // And a later save still works, rather than the store staying wedged.
    expect(store.save(design({ id: "now" })).id).toBe("now");
    expect(store.list().map((entry) => entry.id)).toEqual(["now"]);
  });

  it("tolerates a payload whose designs field is not an array", () => {
    backing.map.set(DESIGNS_KEY, JSON.stringify({ version: STORAGE_VERSION, designs: "nope" }));
    expect(createLocalDesignStore(backing).list()).toEqual([]);
  });
});

describe("get and remove", () => {
  it("gets by id and returns null for anything unknown", () => {
    const store = createLocalDesignStore(backing);
    const saved = store.save(design({ name: "Keeper" }));
    expect(store.get(saved.id)?.name).toBe("Keeper");
    expect(store.get("missing")).toBeNull();
  });

  it("removes only the requested design", () => {
    const store = createLocalDesignStore(backing);
    const first = store.save(design());
    const second = store.save(design());
    store.remove(first.id);
    expect(store.get(first.id)).toBeNull();
    expect(store.list().map((entry) => entry.id)).toEqual([second.id]);
  });

  it("ignores removing something that is not there", () => {
    const store = createLocalDesignStore(backing);
    const saved = store.save(design());
    store.remove("missing");
    expect(store.list().map((entry) => entry.id)).toEqual([saved.id]);
  });
});

describe("draft", () => {
  it("saves, reloads, and clears the in-progress design", () => {
    const store = createLocalDesignStore(backing);
    const draft = design({ name: "Work in progress" });
    store.saveDraft(draft);
    expect(store.loadDraft()?.name).toBe("Work in progress");
    store.saveDraft(null);
    expect(store.loadDraft()).toBeNull();
  });

  it("keeps the draft out of the named designs", () => {
    const store = createLocalDesignStore(backing);
    store.saveDraft(design());
    expect(store.list()).toEqual([]);
    expect(backing.map.has(DRAFT_KEY)).toBe(true);
  });

  it("returns null for a corrupt draft", () => {
    backing.map.set(DRAFT_KEY, JSON.stringify({ id: "d", garment: "tarpaulin" }));
    expect(createLocalDesignStore(backing).loadDraft()).toBeNull();
  });

  it("surfaces quota failures from autosave too", () => {
    const store = createLocalDesignStore(backing);
    backing.full = true;
    expect(() => store.saveDraft(design())).toThrow(StorageQuotaError);
  });
});

describe("subscribe", () => {
  it("notifies on writes and stops after unsubscribing", () => {
    const store = createLocalDesignStore(backing);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const saved = store.save(design());
    store.saveDraft(design());
    store.remove(saved.id);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.save(design());
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not notify for a no-op remove", () => {
    const store = createLocalDesignStore(backing);
    const listener = vi.fn();
    store.subscribe(listener);
    store.remove("missing");
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies when another tab writes the designs key", () => {
    // The unit tests run in Node, so stand in for the one browser API the
    // store touches beyond localStorage.
    const handlers: Array<(event: { key: string | null }) => void> = [];
    vi.stubGlobal("window", {
      addEventListener: (type: string, handler: (event: { key: string | null }) => void) => {
        if (type === "storage") handlers.push(handler);
      },
      removeEventListener: (type: string, handler: (event: { key: string | null }) => void) => {
        if (type !== "storage") return;
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      },
    });
    try {
      const store = createLocalDesignStore(backing);
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      expect(handlers).toHaveLength(1);

      handlers[0]({ key: DESIGNS_KEY });
      expect(listener).toHaveBeenCalledTimes(1);

      handlers[0]({ key: DRAFT_KEY });
      expect(listener).toHaveBeenCalledTimes(2);

      handlers[0]({ key: "unrelated-key" });
      expect(listener).toHaveBeenCalledTimes(2);

      // The window listener belongs to the subscription, not to the store, so
      // a route that mounts and unmounts leaves nothing behind.
      unsubscribe();
      expect(handlers).toHaveLength(0);
      store.subscribe(vi.fn());
      expect(handlers).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("constructs without a DOM at all", () => {
    expect(() => createLocalDesignStore(backing)).not.toThrow();
    expect(typeof globalThis.window).toBe("undefined");
  });
});
