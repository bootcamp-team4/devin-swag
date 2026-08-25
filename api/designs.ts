// The shared design gallery. A single Vercel Function over one Postgres table;
// `vite.config.ts` mounts the same handler at `/api/designs` in dev, so local
// and deployed behaviour come from this file and nothing else.
//
// GET    /api/designs        → { designs: Design[] }, newest first
// PUT    /api/designs        → upsert the design in the body, returns it
// DELETE /api/designs?id=…   → 204
//
// There are no accounts: every visitor reads and writes the same gallery.

import type { IncomingMessage, ServerResponse } from "node:http";
import { Pool } from "pg";
import { parseDesign } from "../src/lib/design";

const MAX_BODY_BYTES = 64 * 1024;
const CONNECT_TIMEOUT_MS = 5_000;
const QUERY_TIMEOUT_MS = 8_000;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new NoDatabaseError();
  // Reused across invocations on a warm function; one connection is plenty for
  // a gallery this size and keeps us inside Neon's free-tier limits.
  pool ??= new Pool({
    connectionString,
    max: 1,
    // Without these a database that accepts the socket but never answers hangs
    // the request until the platform kills it, and the gallery spins forever.
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
  });
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

function json(res: ServerResponse, body: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

/** Reads the request body, refusing anything oversized before buffering it all. */
async function readBody(req: IncomingMessage): Promise<string | null> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** A pg/libpq error code if there is one, so a 502 is diagnosable from outside. */
function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "unknown";
}

// Vercel's Node runtime calls this with (req, res) and waits for `res.end()`.
// A handler that took a `Request` and returned a `Response` was accepted at
// build time and then timed out every invocation at 300s, so the signature is
// the contract here: always end the response.
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // The database is reached only once the request is known to be valid, so a
    // malformed body is a 400 rather than a 503 when there is no database.
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET") {
      const result = await (await ready()).query<{ design: unknown }>(
        "SELECT design FROM designs ORDER BY updated_at DESC",
      );
      json(res, { designs: result.rows.map((row) => row.design) });
      return;
    }

    if (req.method === "PUT") {
      const raw = await readBody(req);
      if (raw === null) {
        json(res, { error: "Design is too large" }, 413);
        return;
      }
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        json(res, { error: "Body is not JSON" }, 400);
        return;
      }
      // The gallery's own parser, so the API cannot accept a design the UI
      // will silently refuse to render (an unknown garment, say).
      const parsed = parseDesign(body);
      if (!parsed || parsed.id.length > 128) {
        json(res, { error: "Body is not a design" }, 400);
        return;
      }

      const design = { ...parsed, updatedAt: new Date().toISOString() };
      await (await ready()).query(
        `INSERT INTO designs (id, design, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET design = EXCLUDED.design, updated_at = now()`,
        [design.id, JSON.stringify(design)],
      );
      json(res, { design });
      return;
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        json(res, { error: "Missing id" }, 400);
        return;
      }
      await (await ready()).query("DELETE FROM designs WHERE id = $1", [id]);
      res.statusCode = 204;
      res.end();
      return;
    }

    json(res, { error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      // The client falls back to this browser's localStorage, so a checkout
      // with no database still runs — it just is not shared.
      json(res, { error: "Shared gallery is not configured" }, 503);
      return;
    }
    console.error("designs api failed", error);
    // The code alone — ETIMEDOUT, ENOTFOUND, 28P01 — says which misconfiguration
    // this is without the message, which can name the host and the role.
    json(res, { error: "Shared gallery is unavailable", code: errorCode(error) }, 502);
  }
}
