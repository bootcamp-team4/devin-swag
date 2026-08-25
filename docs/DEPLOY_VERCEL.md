# Deploying to Vercel

The app is a static Vite + React SPA. There is no server, no database, and no environment
variables — Vercel builds it and serves `dist/` from its CDN.

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
5. Click **Deploy**. The first build takes ~1 minute and yields `https://<project>.vercel.app`.

## Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link       # from the repo root; creates .vercel/ (already gitignored by Vercel's default)
vercel            # preview deployment
vercel --prod     # production deployment
```

## After the first deploy

- Every push to `main` redeploys production; every PR gets its own preview URL with a bot comment.
- Custom domain: **Settings → Domains → Add**, then point the DNS record Vercel shows at it.
  Vercel issues the TLS certificate automatically.
- Nothing to configure for state: designs live in the visitor's `localStorage`, so each browser
  keeps its own designs and nothing is stored server-side.
- Keep CI (lint / typecheck / build / vitest / playwright) as the gate before merge; Vercel only
  runs the build.
