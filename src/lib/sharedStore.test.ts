import { describe, expect, it, vi } from "vitest";
import { createDesign, type Design } from "./design";
import { createSharedDesignStore } from "./sharedStore";
import { createLocalDesignStore, type StorageLike } from "./store";

const design = (overrides: Partial<Design> = {}): Design =>
  createDesign({
    layers: [{ id: "layer-1", markId: "cognition", x: 0.5, y: 0.5, scale: 0.4, rotation: 0 }],
    ...overrides,
  });

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** A fake `/api/designs`: one shared table, the same JSON contract. */
function fakeApi() {
  const rows = new Map<string, Design>();
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (!init?.method || init.method === "GET") {
      const designs = [...rows.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      return new Response(JSON.stringify({ designs }), { status: 200 });
    }
    if (init.method === "PUT") {
      const body = JSON.parse(String(init.body)) as Design;
      const stored = { ...body, updatedAt: new Date().toISOString() };
      rows.set(stored.id, stored);
      return new Response(JSON.stringify({ design: stored }), { status: 200 });
    }
    rows.delete(url.searchParams.get("id") ?? "");
    return new Response(null, { status: 204 });
  });
  return { rows, impl };
}

const options = (fetchImpl?: typeof fetch) => ({
  fetchImpl,
  local: createLocalDesignStore(memoryStorage()),
  pollIntervalMs: 0,
});

describe("shared store", () => {
  it("reads and writes the shared gallery rather than this browser", async () => {
    const api = fakeApi();
    const local = createLocalDesignStore(memoryStorage());
    const store = createSharedDesignStore({ ...options(api.impl as unknown as typeof fetch), local });

    const saved = await store.save(design({ name: "Shared tee" }));

    expect(store.mode()).toBe("shared");
    expect((await store.list()).map((entry) => entry.name)).toEqual(["Shared tee"]);
    // Nothing landed in this browser's own storage.
    expect(await local.list()).toEqual([]);

    await store.remove(saved.id);
    expect(await store.list()).toEqual([]);
  });

  it("sees a design another visitor saved", async () => {
    const api = fakeApi();
    const theirs = design({ name: "Someone else's hoodie", garment: "hoodie" });
    api.rows.set(theirs.id, theirs);
    const store = createSharedDesignStore(options(api.impl as unknown as typeof fetch));

    expect((await store.list()).map((entry) => entry.name)).toEqual(["Someone else's hoodie"]);
  });

  it("falls back to this browser when the API is unreachable, and stays there", async () => {
    const failing = vi.fn(async () => new Response(null, { status: 503 }));
    const local = createLocalDesignStore(memoryStorage());
    const store = createSharedDesignStore({
      ...options(failing as unknown as typeof fetch),
      local,
    });

    const saved = await store.save(design({ name: "Offline tee" }));

    expect(store.mode()).toBe("local");
    expect((await local.list()).map((entry) => entry.name)).toEqual(["Offline tee"]);
    expect((await store.get(saved.id))?.name).toBe("Offline tee");
    // One failed request is enough; later calls do not retry the API.
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it("gives up on an API that never answers instead of loading forever", async () => {
    // A hung request — the deployed symptom of a database that accepts the
    // connection and then stalls — must abort, not stall the gallery.
    const hanging = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const local = createLocalDesignStore(memoryStorage());
    const store = createSharedDesignStore({
      ...options(hanging as unknown as typeof fetch),
      local,
      timeoutMs: 20,
    });

    expect(await store.list()).toEqual([]);
    expect(store.mode()).toBe("local");
  });

  it("keeps the draft in this browser, never in the shared gallery", async () => {
    const api = fakeApi();
    const store = createSharedDesignStore(options(api.impl as unknown as typeof fetch));

    store.saveDraft(design({ name: "Work in progress" }));

    expect(store.loadDraft()?.name).toBe("Work in progress");
    expect(await store.list()).toEqual([]);
  });
});
