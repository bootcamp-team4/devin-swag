// The shared design gallery. A single Vercel Function over one Postgres table;
// `vite.config.ts` mounts the same handler at `/api/designs` in dev, so local
// and deployed behaviour come from this file and nothing else.
//
// GET    /api/designs        → { designs: Design[] }, newest first
// PUT    /api/designs        → upsert the design in the body, returns it
// DELETE /api/designs?id=…   → 204
//
// There are no accounts: every visitor reads and writes the same gallery.

import { Pool } from "pg";

const MAX_BODY_BYTES = 64 * 1024;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new NoDatabaseError();
  // Reused across invocations on a warm function; one connection is plenty for
  // a gallery this size and keeps us inside Neon's free-tier limits.
  pool ??= new Pool({ connectionString, max: 1 });
  return pool;
}

class NoDatabaseError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "NoDatabaseError";
  }
}

/**
 * Created on demand rather than by a migration step: one table, no history to
 * migrate, and the free-tier setup is "paste a connection string".
 */
async function ready(): Promise<Pool> {
  const db = getPool();
  schemaReady ??= db
    .query(
      `CREATE TABLE IF NOT EXISTS designs (
         id         text PRIMARY KEY,
         design     jsonb NOT NULL,
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined)
    // A cached rejection would wedge every later request on this warm instance,
    // so a transient failure is forgotten and retried on the next request.
    .catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  await schemaReady;
  return db;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Server-side shape check. The client re-validates with `parseDesign`. */
function isDesignish(value: unknown): value is { id: string } {
  if (typeof value !== "object" || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "string" &&
    raw.id.length > 0 &&
    raw.id.length <= 128 &&
    typeof raw.garment === "string" &&
    typeof raw.colour === "string" &&
    Array.isArray(raw.layers)
  );
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const db = await ready();
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET") {
      const result = await db.query<{ design: unknown }>(
        "SELECT design FROM designs ORDER BY updated_at DESC",
      );
      return json({ designs: result.rows.map((row) => row.design) });
    }

    if (request.method === "PUT") {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) return json({ error: "Design is too large" }, 413);
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return json({ error: "Body is not JSON" }, 400);
      }
      if (!isDesignish(body)) return json({ error: "Body is not a design" }, 400);

      const design = { ...body, updatedAt: new Date().toISOString() };
      await db.query(
        `INSERT INTO designs (id, design, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET design = EXCLUDED.design, updated_at = now()`,
        [design.id, JSON.stringify(design)],
      );
      return json({ design });
    }

    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Missing id" }, 400);
      await db.query("DELETE FROM designs WHERE id = $1", [id]);
      return new Response(null, { status: 204 });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      // The client falls back to this browser's localStorage, so a checkout
      // with no database still runs — it just is not shared.
      return json({ error: "Shared gallery is not configured" }, 503);
    }
    console.error("designs api failed", error);
    return json({ error: "Shared gallery is unavailable" }, 502);
  }
}
