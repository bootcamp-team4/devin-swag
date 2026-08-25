// The shared-gallery store: a DesignStore over `/api/designs`, falling back to
// this browser's localStorage when the API is absent or unreachable. The
// fallback is what keeps `git clone && npm run dev` working with no database,
// no env vars, and no accounts. No React, no imports from src/components.

import { parseDesign, type Design } from "./design";
import { createLocalDesignStore, type DesignStore } from "./store";

export const DESIGNS_ENDPOINT = "/api/designs";

/** How the gallery is currently being served, so the UI can say which it is. */
export type StoreMode = "shared" | "local";

export interface SharedDesignStore extends DesignStore {
  mode(): StoreMode;
}

/** Other people's designs only arrive by asking; this is how often we ask. */
export const POLL_INTERVAL_MS = 15_000;

/**
 * A request that never settles would leave the gallery loading forever, so a
 * slow API is treated as an absent one and the browser's own designs are shown.
 */
export const REQUEST_TIMEOUT_MS = 10_000;

type Options = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  local?: DesignStore;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

function parseAll(value: unknown): Design[] {
  if (typeof value !== "object" || value === null) return [];
  const raw = (value as { designs?: unknown }).designs;
  if (!Array.isArray(raw)) return [];
  const designs: Design[] = [];
  for (const entry of raw) {
    const design = parseDesign(entry);
    if (design) designs.push(design);
  }
  return designs;
}

/** `AbortSignal.timeout` where it exists; older browsers just get no timeout. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  if (ms <= 0 || typeof AbortSignal === "undefined") return undefined;
  return typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined;
}

export function createSharedDesignStore(options: Options = {}): SharedDesignStore {
  const endpoint = options.endpoint ?? DESIGNS_ENDPOINT;
  const local = options.local ?? createLocalDesignStore();
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const doFetch = options.fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const listeners = new Set<() => void>();
  let mode: StoreMode = doFetch ? "shared" : "local";
  let timer: ReturnType<typeof setInterval> | null = null;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  /**
   * One request. Any failure — offline, 503 because DATABASE_URL is unset, a
   * 502 from Postgres — drops the whole session to the local store rather than
   * retrying per call, so the UI reports one stable state instead of flapping.
   */
  const request = async (init: RequestInit & { query?: string } = {}): Promise<unknown> => {
    if (!doFetch) throw new Error("fetch is unavailable");
    const response = await doFetch(`${endpoint}${init.query ?? ""}`, {
      ...init,
      headers: init.body ? { "content-type": "application/json" } : undefined,
      signal: timeoutSignal(timeoutMs),
    });
    if (!response.ok) throw new Error(`${endpoint} responded ${response.status}`);
    if (response.status === 204) return null;
    return (await response.json()) as unknown;
  };

  const fallBack = () => {
    if (mode === "shared") {
      mode = "local";
      notify();
    }
  };

  async function shared<T>(remote: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (mode === "local") return fallback();
    try {
      return await remote();
    } catch {
      fallBack();
      return fallback();
    }
  }

  const list = (): Promise<Design[]> =>
    shared(
      async () => parseAll(await request()),
      () => local.list(),
    );

  return {
    mode: () => mode,

    list,

    get(id) {
      return shared(
        async () => (await list()).find((design) => design.id === id) ?? null,
        () => local.get(id),
      );
    },

    save(design) {
      return shared(
        async () => {
          const body = await request({ method: "PUT", body: JSON.stringify(design) });
          const stored = parseDesign((body as { design?: unknown } | null)?.design);
          if (!stored) throw new Error("Saved design came back unreadable");
          notify();
          return stored;
        },
        () => local.save(design),
      );
    },

    remove(id) {
      return shared(
        async () => {
          await request({ method: "DELETE", query: `?id=${encodeURIComponent(id)}` });
          notify();
        },
        () => local.remove(id),
      );
    },

    loadDraft: () => local.loadDraft(),
    saveDraft: (design) => local.saveDraft(design),

    subscribe(listener) {
      const unsubscribeLocal = local.subscribe(listener);
      listeners.add(listener);
      // Polling is what surfaces another person's save; it only runs while
      // something is actually watching.
      if (timer === null && pollIntervalMs > 0 && typeof setInterval === "function") {
        timer = setInterval(notify, pollIntervalMs);
      }
      return () => {
        listeners.delete(listener);
        unsubscribeLocal();
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
  };
}
