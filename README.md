# Cognition Merch Designer

Pick a blank garment, drag Cognition artwork onto it, arrange it, save the design, download a PNG mockup.
It is a design tool, not a store: nothing here sells, quotes, orders, or prints anything.

The authoritative spec is [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

## Run it locally

No accounts, no env vars, no services.

```bash
nvm use          # Node 22 (see .nvmrc); any Node >= 20.19 works
npm install
npm run dev      # http://localhost:5173
```

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm test         # vitest — pure logic in src/lib
npm run test:e2e # playwright, chromium
```

CI runs all of the above on every pull request.

## Brand assets

`public/brand` holds the three placeable marks. `src/brand/marks.ts` is generated from them by
`npm run marks` and holds the same artwork inlined as strings and data URIs.

The inlining is not an optimisation. The PNG export rasterises a serialised SVG through an
`Image`, and that never fetches external `href`s — an export referencing `/brand/mark-otter.png`
silently produces a blank garment. Anything on the export path must be self-contained.

The two wordmark/logo marks are monochrome and carry an `__INK__` token in place of a fill, so the
renderer can ink them in the garment's contrast colour. The otter is a full-colour raster whose
white matte was keyed out once at asset intake, so it does not invert per colourway.
