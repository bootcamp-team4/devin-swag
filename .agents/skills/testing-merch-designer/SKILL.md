---
name: testing-merch-designer
description: How to run and browser-test the devin-swag merch designer (Vite + React + TS, localStorage only) end-to-end, including printable-area/clamping checks and known computer-use keyboard quirks.
---

# Testing the devin-swag merch designer

## Running the app
- Node 22.12.0 is required: `source ~/.nvm/nvm.sh && nvm use` (the default `node` 20.18.1 breaks jsdom tests).
- Dev: `npm run dev` (5173). Production preview: `npm run build && npm run preview -- --port 4173`.
- Use `http://localhost:<port>`, not `127.0.0.1`.
- To compare a branch against `main`, build a second worktree/checkout and serve it on another port
  (e.g. 4174) so you can A/B the same page side by side (`npm run preview -- --port 4174`).
- No backend, no login, no env vars, no secrets. All state lives in `localStorage` keys
  `cognition-merch-designer:designs` and `:draft` (drafts autosave ~400 ms after a change).

## Routes and controls
- `/` editor, `/designs` gallery, `/contact-sheet` dev-only renderer reference page.
- Editor sidebar: Garment / Colour radios, Artwork tray (click = place at centre, drag = place at
  drop point; a drag released outside the canvas falls back to a centre placement), Selected artwork
  panel (Bigger/Smaller/Rotate left/Rotate right/Bring forward/Send back/Duplicate/Delete plus a
  `NN% · DD°` readout — read this instead of guessing from pixels), Design name, Save design,
  Download PNG (2000×2000, sanitized file name).
- Tab order reaches each canvas layer, so keyboard-only selection works: Tab to a layer, then arrows
  move, `+`/`-` scale, `[`/`]` rotate, Delete removes, Esc deselects.

## Computer-use quirks worth knowing
- The `type` action can drop `:` and can emit bogus keysyms (`IntlRo`, `IntlYen`, null) for `+`.
  - Type URLs as `type "http"` + `key shift+semicolon` + `type "//localhost"` + `key shift+semicolon` + `type "4173/"`.
  - Use `key shift+equal` to send a real `+`; `ctrl+shift+equal` zooms the page (plain `ctrl+plus` may do nothing).
- Prefer clicking the sidebar buttons over keyboard for scale/rotate when you just need a state change.

## Verifying printable-area containment rigorously
Eyeballing the dashed rectangle is unreliable — the blue selection box is *not* the artwork, and the
mark PNGs have transparent padding. Two reliable techniques:
1. Screenshot pixel analysis with Pillow: the printable outline is drawn in `#e78c3b`; find its rows
   and columns, then scan for artwork-coloured pixels outside it.
2. Best: click **Download PNG** and analyse the 2000×2000 export against
   `PRINTABLE_AREAS` from `src/lib/design.ts` (e.g. t-shirt `x 0.3–0.7, y 0.28–0.62`), drawing the
   rectangle onto a crop for a human-readable artifact.

## Known / possible bug to re-check
- Rotation does not re-fit scale: `scaleLayer` caps at `maxScaleFor` for the *current* rotation, but
  `rotateLayer` only re-clamps position, so rotating an already max-scaled layer (e.g. Devin logo at
  100% rotated 90°, or otter at 85% rotated 45°) pushes the layer box — and real ink — outside the
  printable rectangle, including in the exported PNG. If a fix lands, re-verify with the export-PNG
  analysis above. A plausible fix is re-fitting scale inside the rotate action.
