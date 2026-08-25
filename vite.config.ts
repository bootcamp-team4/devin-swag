import { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin, type ViteDevServer } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_PATH = "/api/designs";

/**
 * Runs `api/designs.ts` — the same module Vercel deploys as a Function — inside
 * the dev server, so `npm run dev` and production share one implementation.
 * Without DATABASE_URL the handler answers 503 and the client falls back to
 * localStorage, which is the no-database local-run path.
 */
function designsApi(): Plugin {
  return {
    name: "designs-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith(API_PATH)) return next();
        try {
          const { default: handler } = (await server.ssrLoadModule("/api/designs.ts")) as {
            default: (request: Request) => Promise<Response>;
          };
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
          const response = await handler(
            new Request(new URL(req.url, "http://localhost"), {
              method: req.method,
              headers: new Headers(req.headers as Record<string, string>),
              body,
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // DATABASE_URL is server-side, so it is read here rather than exposed to the
  // client through import.meta.env.
  const env = loadEnv(mode, process.cwd(), "");
  // Assigning undefined would store the string "undefined", which reads as a
  // configured database and turns the fast 503 into a connection failure.
  if (env.DATABASE_URL) process.env.DATABASE_URL ??= env.DATABASE_URL;

  return {
    plugins: [react(), tailwindcss(), designsApi()],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      passWithNoTests: true,
    },
  };
});
