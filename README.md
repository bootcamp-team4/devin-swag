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

## Using it

1. Pick a garment and a colour in the right rail (t-shirt, hoodie, or cap × black or white).
2. Drag a mark out of the artwork tray onto the garment, or click it to drop it in the centre.
3. Drag the artwork to move it; use its corner handle to scale and the handle above it to rotate.
   Artwork cannot leave the garment's printable area.
4. Name the design and press **Save design**. Work in progress autosaves to the same browser, so a
   reload picks up where you left off.
5. **Saved designs** lists every design anyone has saved — open, rename, duplicate, or delete.
6. **Download PNG** writes a 2000×2000 mockup of the garment. It is a mockup for sharing, not a
   print-ready file.

Everything above works from the keyboard: Tab reaches the tray and the artwork, Enter places a
mark, arrows move it (Shift for bigger steps), `+`/`-` scale, `[`/`]` rotate, Delete removes, and
Escape deselects. The same transforms are buttons under **Selected artwork**.

Saved designs live in a shared Postgres table behind `/api/designs`, so everyone sees everyone
else's work; there are no accounts, and anyone can rename or delete any design. The in-progress
autosave stays in this browser's `localStorage`.

With no `DATABASE_URL` set — the default for a fresh clone — the API answers 503 and the app falls
back to `localStorage`, so `npm run dev` still works with no services and no accounts. See
[`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) for pointing it at a database and deploying.

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

The Cognition mark is monochrome and carries an `__INK__` token in place of a fill, so the renderer
can ink it in the garment's contrast colour. The Devin lockup and the otter are full-colour rasters
whose mattes were keyed out once at asset intake; Devin ships as two files, one per colourway,
because its hexagons must not recolour.

## Layout

Dependencies point downward only — nothing in `src/lib` may import from `src/components` or
`src/routes`.

| | |
|---|---|
| `src/lib/design.ts` | `Design`/`Layer` types, printable-area geometry, clamping. Pure. |
| `src/lib/render.ts` | `renderDesign(design, size) → Scene`, with `toReactSvg` and `toSvgString` adapters. |
| `src/lib/store.ts` | The `DesignStore` interface, and the `localStorage` implementation of it. |
| `src/lib/sharedStore.ts` | `DesignStore` over `/api/designs`, falling back to `localStorage`. |
| `api/designs.ts` | The shared gallery: one Vercel Function over one Postgres table. |
| `src/state/designReducer.ts` | Editor state as a reducer, so undo/redo stays cheap. |
| `src/components/editor/*` | React + Pointer Events: tray, drag, handles, picker. |
| `src/routes/*` | `/` editor, `/designs` gallery, and a dev-only `/contact-sheet`. |

Layer coordinates are fractions of the printable area, never pixels — that is what lets the 320px
thumbnail, the editor canvas, and the 2000px export agree.
