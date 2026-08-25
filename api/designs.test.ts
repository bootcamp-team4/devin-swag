import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import handler from "./designs";

/**
 * Vercel invokes the function as `(req, res)` and waits for `res.end()`; a
 * handler with the web `Request`/`Response` signature deployed fine and then
 * timed out every request. These exercise the signature, not the database.
 */
function fakeReq(method: string, body?: unknown, url = "/api/designs"): IncomingMessage {
  return {
    method,
    url,
    headers: {},
    async *[Symbol.asyncIterator]() {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    },
  } as unknown as IncomingMessage;
}

function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    ended: false,
    setHeader(key: string, value: string) {
      res.headers[key] = value;
    },
    end(body?: string) {
      res.body = body;
      res.ended = true;
    },
  };
  return res;
}

const withoutDatabase = () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  return () => {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  };
};

describe("designs api", () => {
  let restore: (() => void) | null = null;

  afterEach(() => {
    restore?.();
    restore = null;
  });

  it("ends the response instead of returning one", async () => {
    restore = withoutDatabase();
    const res = fakeRes();

    const returned = await handler(fakeReq("GET"), res as unknown as ServerResponse);

    expect(returned).toBeUndefined();
    expect(res.ended).toBe(true);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Shared gallery is not configured" });
  });

  it("answers every method it accepts, so none can hang", async () => {
    restore = withoutDatabase();

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const res = fakeRes();
      await handler(fakeReq(method), res as unknown as ServerResponse);
      expect(res.ended, method).toBe(true);
    }
  });

  it("rejects a design the gallery could not render", async () => {
    // "tee" is not one of GARMENTS, so parseDesign drops it and the design
    // would sit in the shared table invisible to every visitor.
    restore = withoutDatabase();
    const res = fakeRes();

    await handler(
      fakeReq("PUT", {
        id: "unrenderable",
        name: "Nope",
        garment: "tee",
        colour: "black",
        layers: [],
      }),
      res as unknown as ServerResponse,
    );

    // 400, not the 503 an unconfigured database would give: it never got there.
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body ?? "{}")).toEqual({ error: "Body is not a design" });
  });
});
