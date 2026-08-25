# Deploying to Vercel

The app is a Vite + React SPA plus one Vercel Function, `api/designs.ts`, which serves the shared
design gallery out of Postgres. Vercel builds the SPA, serves `dist/` from its CDN, and runs the
function on request.

Without `DATABASE_URL` the function answers 503 and the client silently falls back to the
visitor's own `localStorage`, so the app still runs — the gallery just is not shared.

`vercel.json` in the repo root already pins everything Vercel needs:

- `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, `installCommand: npm ci`
- a catch-all rewrite to `/index.html` so React Router's `BrowserRouter` deep links
  (e.g. `/designs/abc`) do not 404 on a hard refresh

## Option A — Vercel dashboard (recommended)

1. Sign in at https://vercel.com with the GitHub account that can read `bootcamp-team4/devin-swag`.
2. **Add New… → Project → Import Git Repository**, pick `bootcamp-team4/devin-swag`.
   If the repo is not listed, use *Adjust GitHub App Permissions* and grant access to it.
3. Leave the build settings as detected — they come from `vercel.json`. Root directory stays `./`.
4. Set the Node.js version to 22.x under **Settings → General → Node.js Version**
   (the repo requires Node >= 20.19; `.nvmrc` pins 22.12.0).
5. Add the database: **Storage → Create Database → Neon (Postgres)**, free plan, and connect it to
   this project. Vercel injects `DATABASE_URL` into every environment; nothing else to configure.
   The `designs` table is created on the first request.
6. Click **Deploy**. The first build takes ~1 minute and yields `https://<project>.vercel.app`.

## Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link       # from the repo root; creates .vercel/ (already gitignored by Vercel's default)
vercel            # preview deployment
vercel --prod     # production deployment
```

Any Postgres works — Supabase, RDS, a local server — as long as `DATABASE_URL` points at it.

## Running the shared gallery locally

`vite.config.ts` mounts the same `api/designs.ts` handler on the dev server, so:

```bash
echo 'DATABASE_URL=postgres://user:pass@host/db' >> .env.local   # gitignored
npm run dev
```

With no `DATABASE_URL` this step is unnecessary: `npm run dev` still works and the gallery is
local to the browser. Note that `npm run preview` serves static files only — it does not run the
function, so the preview build always uses the local fallback.

## After the first deploy

- Every push to `main` redeploys production; every PR gets its own preview URL with a bot comment.
- Custom domain: **Settings → Domains → Add**, then point the DNS record Vercel shows at it.
  Vercel issues the TLS certificate automatically.
- The gallery is shared and anonymous: every visitor sees every design and can rename or delete
  any of them. There are no accounts and no per-user ownership.
- Keep CI (lint / typecheck / build / vitest / playwright) as the gate before merge; Vercel only
  runs the build.
