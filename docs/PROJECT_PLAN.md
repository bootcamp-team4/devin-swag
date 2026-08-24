# Cognition Merch Store — Project Plan (v4)

Scope locked with Robin on 2026-08-24:
public storefront · **no real payments** · **no inventory/fulfillment** · demo application · built from scratch · brand assets from the Cognition press kit · repo `bootcamp-team4/devin-swag`.

Team: **Rush** product lead · **Gina** technical lead · **Robin** process lead. Planning only — no implementation has started.

**Product model:** three base garments — **T-shirt, hoodie, cap** — each in **black or white**, each combinable with one of three **brand marks: Cognition logo, Devin logo, Otter mascot**. The mark is the product's point of interest, so the artwork picker is core scope, not a stretch goal.

---

## 1. Target User & Problem

**Primary user — "the fan/visitor."** Someone who lands on the store from a Cognition link, a conference QR code, or a Devin session and wants to see what merch exists and what it would cost. Today there is no such surface: merch appears ad hoc at events and in DMs, so there is nowhere to point people, no consistent product presentation, and no way to gauge interest.

**Secondary user — "the internal stakeholder."** Marketing/DevRel who needs to show what a Cognition store would look and feel like — in a deck, a demo, or a stakeholder review — before anyone commits to a payment processor, a print vendor, or inventory.

**Problem statement.** There is no branded, shareable storefront for Cognition merch. This project delivers the complete shopping *experience* — browse, inspect, configure, cart, checkout flow — without the commerce backend, so the concept can be evaluated and demoed now and turned into a real store later by swapping in payments and fulfillment.

**Explicit non-problem.** This release is not trying to sell anything, take money, track stock, or ship a package.

## 2. Product Goal & Definition of Done

**Goal:** a fast, on-brand, fully navigable demo storefront that a visitor can use end to end — from landing page to an order-confirmation screen — where the only thing that isn't real is the transaction.

**Definition of done.** All must be true:

1. A visitor can complete the golden path unaided: home → catalog → product detail → **pick mark, colour, and size** → add to cart → cart → checkout form → confirmation screen with an order number.
2. All **18 base combinations** (3 garments × 2 colours × 3 marks) are browsable and purchasable, each rendering a distinct mockup built from the real brand assets, with sizes on the garments.
3. Changing the mark or the colour on a product page updates the mockup, the URL, and the cart line — the chosen mark is carried through cart, checkout, and confirmation.
4. Cart persists across page reloads and browser restarts; two cart lines differing only by mark are distinct lines.
5. Every "purchase" surface is unmistakably a demo: a persistent banner/label states no payment is taken and no order is fulfilled; the checkout form accepts no card data.
6. Responsive from 360px to desktop; keyboard-navigable golden path including the mark picker; no axe-core critical violations on catalog, PDP, cart, checkout.
7. `npm run lint`, `tsc --noEmit`, and `npm run build` pass clean in CI on every PR.
8. Playwright e2e covering the golden path passes in CI.
9. Deployed to a shareable preview URL, and the repo README explains how to run it and how to swap the mock checkout for a real one.
10. Lighthouse ≥90 performance and ≥95 accessibility on the catalog page.

**Anti-goals (explicitly not done):** payment processing, real inventory, user accounts, admin CMS, email, analytics vendor, print vendor integration.

## 3. Scope

### 3.0 The product matrix

The catalog is one small, deliberate grid rather than a long product list. Everything else in the plan follows from it.

| Base garment | Colours | Sizes | Marks | SKUs |
|---|---|---|---|---|
| T-shirt | Black, White | XS–2XL (6) | Cognition, Devin, Otter | 36 |
| Hoodie | Black, White | XS–2XL (6) | Cognition, Devin, Otter | 36 |
| Cap | Black, White | One size | Cognition, Devin, Otter | 6 |

**78 SKUs from 3 garments × 2 colours × 3 marks × sizes** — generated from the matrix in code, never hand-listed. Pricing is per garment, not per mark: tee $32, hoodie $78, cap $34.

Two consequences the team should agree on explicitly:

1. **The mark is a product axis, not a category.** `/products/tshirt?mark=otter&color=black` is the canonical URL; the catalog grid shows garment × mark tiles so all nine visual combinations are visible at a glance, with colour switched on the product page.
2. **Contrast is a real constraint.** A black mark on a black tee is invisible, so each mark ships in both black and white and the mockup picks the variant that contrasts with the garment. This is a rendering rule, not a data field.

**Asset status:** Cognition logo and Devin logo are in the press kit (SVG, black and white). **The otter mascot is not** — see the dependency table in §4.

### Must-have (M)
| ID | Feature | Notes |
|---|---|---|
| M1 | Design system & app shell | Monochrome brand tokens, type scale, header with cart badge, footer, demo banner |
| M2 | Product matrix data model | Typed module generating the garment × colour × mark × size matrix; prices in integer cents; SKU derived from the axes |
| M3 | Home page | Hero, the three garments, the three marks as entry points |
| M4 | Catalog page | Grid of garment × mark tiles, filter by garment and by mark, colour toggle, empty state — filter state in the URL |
| M5 | Product detail page | Mockup preview, **mark picker**, colour picker, size picker, price, description, size chart, add-to-cart |
| M6 | Mockup rendering engine | Garment silhouettes (tee, hoodie, cap) in black and white with a mark composited at the correct placement and scale, contrast-aware; one component, three garment shapes, three marks |
| M7 | Cart | Persistent (localStorage), qty edit, remove, subtotal/shipping/tax estimate, empty state |
| M8 | Mock checkout | Shipping-details form with validation, order summary, no payment fields, "Place demo order" |
| M9 | Confirmation | Generated order number, order recap, clear "this is a demo" copy, back-to-catalog |
| M10 | Responsive & a11y pass | 360px→desktop, focus states, labels, semantic landmarks |
| M11 | CI, tests, deploy | Lint/typecheck/build/e2e in CI; preview deploy; README |

### Optional / stretch (O) — only after every M lands
| ID | Feature |
|---|---|
| O1 | Placement options (left chest vs. centre chest vs. sleeve) and a large back print |
| O1b | Additional garments (long sleeve, beanie, tote) reusing the same matrix |
| O2 | Discount-code field that visibly applies a fake code (`DEVIN10`) |
| O3 | Wishlist / "save for later" |
| O4 | Bundles ("new-hire kit") |
| O5 | Dark/light theme toggle |
| O6 | Fake order-status page (a mock tracking timeline) |
| O7 | OG images per product for link previews |
| O8 | Real Stripe test-mode checkout behind an env flag — the seam that makes this a real store |

### Out of scope
Accounts/auth, admin UI, database, real payments, tax/shipping engines, print-on-demand, i18n, multi-currency, reviews.

## 4. Technical Approach

**Stack (chosen, with reasons):**
- **Next.js 16 (App Router) + TypeScript + Tailwind v4** — server components make the catalog fast and SEO-clean; one deployable; the App Router gives us the route seams to add real APIs later.
- **No database, no backend.** Catalog is a typed static module (`src/lib/products.ts`); cart is React context + `localStorage`; the mock order is generated client-side. This is the single biggest scope reducer and is fully reversible.
- **Imagery generated in-repo.** No product photography exists, so mockups are composed at render time:
  ```tsx
  <Mockup garment="hoodie" color="black" mark="otter" />
  // → <svg>{garmentPath[garment][color]}<image href={markAsset(mark, contrastOn(color))} …/></svg>
  ```
  Three garment silhouettes × two colourways × three marks, composed rather than enumerated: **9 assets produce 18 visuals**, and adding a fourth garment or a fourth mark is one new asset, not a new image set. Swapping in real photography later replaces this one component.
- **Testing:** Playwright for the golden path, Vitest for cart/price maths, axe-core in the a11y test.
- **CI:** GitHub Actions — lint, typecheck, build, unit, e2e on every PR.
- **Hosting:** Vercel preview per PR + a production preview URL. *Requires the user's/org's Vercel account — I will not deploy to a personal account.*

**Key design decision — the "commerce seam."** All cart/checkout side effects go through one module (`src/lib/commerce.ts`) exposing `createOrder(cart, details)`. The demo implementation returns a fake order synchronously. Swapping in Stripe later means replacing that one function and its call sites, not rewriting the flow. This is what makes O8 cheap and keeps the demo honest about what it is.

**Dependencies (technical):** `next`, `react`, `tailwindcss`, `@playwright/test`, `vitest`, `@axe-core/playwright`. Nothing else — no UI kit, no state library. Every dependency pinned to a version published ≥7 days before adoption.

**Dependencies (external, blocking):**
| Dependency | Owner | Needed by | Status |
|---|---|---|---|
| Repo + write access | Gina | T1 | Done — `bootcamp-team4/devin-swag` |
| Otter mascot artwork | Rush | T4 | **Resolved** — supplied by Robin, committed at `assets/brand/mark-otter.png` (400×400 RGB). Two follow-ons in T4: it needs an alpha channel (it ships on a white matte) and it is full-colour, so it is the one mark that does not invert for the black colourway |
| Confirmed prices for tee / hoodie / cap | Rush | T2 | Placeholders in use |
| Vercel account/team for deploys | Robin | T11 | Open |
| Brand approval on generated mockups | Rush → Marketing | before external sharing | Open |

**Major risks:**
| Risk | Impact | Mitigation |
|---|---|---|
| No product photography exists | Store looks unfinished; blocks external sharing | Generated SVG mockups (M6); treat photography as a later swap behind one component |
| Otter is a 400×400 raster with a white matte, while the other marks are vector and monochrome | Visible white box on black garments; soft edges on a hoodie-sized print | T4 keys background removal and print scale off the asset type; 400px is adequate for on-screen mockups but not for real print, so a vector or ≥2000px otter is a prerequisite for any actual production run (out of demo scope) |
| Mark invisible against the garment (black on black) | Mockups look broken | Contrast rule in the mockup engine: monochrome marks are inverted per colourway, the full-colour otter keeps its palette and is checked against both garments by eye |
| Only 3 garments makes the catalog look thin | Demo feels like a stub | Lean into it — present it as a curated capsule drop; the grid shows 9 garment × mark tiles, which reads as a full catalogue page |
| Mockup engine (T4) is the one genuinely hard piece and it is now on the critical path | Slips the whole demo | It is the only ticket sized L before T7, it is parallelized as PR 4, and the fallback is a flat wordmark-on-colour tile that satisfies every DoD item except visual polish |
| Demo mistaken for a real store — someone tries to buy | Trust/support problem | M4 of DoD: persistent demo banner, no card fields, confirmation copy states nothing was charged |
| Brand misuse of press-kit assets | Marketing rework | Use assets unmodified — no recolouring, no redrawing; brand review before external sharing |
| Fake prices/product names leak into a public deck as fact | Misleading stakeholders | Label placeholder copy in the UI until Marketing supplies the real list |
| Scope creep toward real commerce | Blows the demo timebox | O8 is explicitly optional and gated behind the commerce seam |

## 5. Team, Roles & Ownership

| Role | Person | Owns | Accountable for |
|---|---|---|---|
| Product lead | **Rush** | Target user, product goal, scope, final demonstration | Sections 1–3 of this doc stay true; the demo script and the live walkthrough |
| Technical lead | **Gina** | Architecture, technical quality, major technical decisions | Section 4; the commerce seam; approving any dependency or architecture change |
| Process/project lead | **Robin** | Tickets, status, dependencies, coordination | Section 7 board is current; blockers surfaced within a day; scope-cut calls made early |
| Implementation | **Rush, Gina, Robin (each driving Devin)** | Their assigned PRs end to end | Getting their PR to green CI and merged |
| Review | **Rush / Robin / Gina** | Every PR has exactly one named reviewer | Reviewing within one working day |

**Everyone implements.** Each of the three leads drives Devin on their own PRs and is the author of record. Devin is the executor, not an owner: it writes the code, but a named human owns the outcome, the review response, and the merge.

Distribution of the nine must-have PRs: Gina 3 (foundational/architectural), Rush 3 (customer-facing surfaces), Robin 3 (state, flow, and quality). No one reviews their own PR.

## 6. Surface Strategy — Devin CLI vs. Desktop vs. Cloud

The split is by the *nature of the work*, not by preference. Rule of thumb: **Cloud when the output is a PR, Desktop when the output is a screenshot or a recording, CLI when a human is in the loop editing.**

### Cloud (Devin sessions in the webapp) — the default for implementation
Every ticket that produces a PR runs here: T1–T11 and any optional work. Best fit because sessions are long-running, produce reviewable PRs, survive the owner closing their laptop, and can be parallelized as child sessions.
- **Parallelized here:** PR 2 (matrix data model), PR 3 (app shell), PR 4 (mockup engine) touch disjoint files and run as three concurrent sessions owned by three different people — the single biggest schedule compression available to us, and it front-loads T4, the riskiest ticket.
- **Also here:** CI failure triage, review-comment fixes, and the optional-scope PRs.
- **Owner-in-Cloud pattern:** the PR owner opens their own session, prompts Devin with the ticket's acceptance criteria verbatim, and stays responsible for the result.

### Desktop (Devin's VM GUI and browser) — verification and demo artifacts
Used where the deliverable is visual evidence, not code:
- Golden-path click-through and responsive verification at 360 / 768 / 1280 on every UI PR (PRs 3–8).
- Accessibility spot-checks that automation misses: focus order, visible focus rings, zoom to 200%.
- **The final demonstration recording** for Rush — the artifact that goes in the readout. This is a Desktop deliverable, not a Cloud one.
- Already done here: pulling the brand assets out of the Google Drive press kit.

### CLI (Devin CLI on a lead's own machine) — human-in-the-loop editing
Used where a human wants a sub-minute loop and no PR overhead:
- Rush editing garment copy, prices, and mark definitions in `src/lib/products.ts` while looking at `npm run dev` (T12) — content iteration is far faster locally than through a session.
- Rush iterating on mark placement and scale in the mockup engine against the contact-sheet route: this is a visual judgement call with a dozen small numeric tweaks, which is exactly the wrong shape for a Cloud round trip and the right shape for the CLI.
- Gina spiking an architecture question (does the commerce seam hold up against a real Stripe call?) before committing the team to it in a Cloud PR.
- Anyone reproducing a review comment locally before asking for a fix.
- Output still lands as a normal PR; the CLI is the authoring environment, not a bypass of review.

### Explicitly not used
No production deploys from anyone's personal account. Previews come from the org's Vercel project or the demo runs locally.

## 7. Tickets

Estimates are in Devin sessions (S ≈ ¼, M ≈ ½, L ≈ 1). "Owner" is the human accountable for the ticket; Devin executes on the named surface.

| ID | Title | Owner | Surface | Est | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| T0 | Repo + Vercel access | Gina | — | — | — | Repo exists with all leads and Devin as collaborators; branch protection on `main` requiring one review and green CI; Vercel project connected or an explicit "no deploy" decision recorded |
| T0b | Source the otter mascot artwork | Rush | — | — | — | **Done** — asset in repo at `assets/brand/mark-otter.png`; alpha-channel and colour-on-black handling folded into T4 |
| T1 | Scaffold app, CI, brand tokens | Gina | Cloud | M | T0 | Next.js 16 + TS + Tailwind builds; lint/typecheck/build green in GitHub Actions; press-kit assets committed under `public/brand`; monochrome tokens defined; README with run instructions |
| T2 | Product matrix data model | Gina | Cloud | M | T1 | `src/lib/products.ts` generates the garment × colour × mark × size matrix from three garment definitions and three mark definitions — no hand-listed SKUs; SKU format `TEE-BLACK-OTTER-L`; prices integer cents per garment; unit tests cover SKU generation, lookup, and price maths; adding a fourth mark is a one-line change (test proves it) |
| T3 | App shell: header, footer, demo banner | Robin | Cloud | S | T1 | Header with wordmark, nav, cart badge; footer; demo banner on every page; responsive at 360px; full keyboard navigation |
| T4 | Mockup rendering engine | Rush | Cloud + Desktop | L | T1, T0b | `<Mockup garment color mark />` renders all 18 combinations distinctly at grid and detail sizes; garment silhouettes for tee, hoodie, cap; marks used unmodified and auto-contrasted against the garment colour (the otter is full-colour and keeps its palette on both colourways; its white matte is removed so no box shows on black); no external image requests; alt text describes garment, colour, and mark; contact-sheet screenshot of all 18 attached to the PR |
| T5 | Home page | Rush | Cloud | S | T2, T3, T4 | Hero, the three garments, the three marks as entry points into a filtered catalog; Lighthouse ≥90 perf / ≥95 a11y |
| T6 | Catalog: grid + filters | Rush | Cloud | M | T2, T3, T4 | Grid of the 9 garment × mark tiles; filter by garment and by mark; colour toggle switches every tile; state in the URL and survives refresh and sharing; empty state with reset; result count announced to screen readers |
| T7 | Product detail page + mark picker | Rush | Cloud | L | T6 | Mark, colour, and size pickers each update the mockup, the price where relevant, and the URL without a full reload; deep link `?mark=otter&color=black` restores exact state; size chart on garments; caps have no size picker; add-to-cart feedback names the chosen combination |
| T8 | Cart | Robin | Cloud | M | T7 | Add / change qty / remove; lines keyed by full SKU so same garment with different marks are distinct lines showing their own mockup; persists across reload and browser restart; subtotal, shipping and tax estimates, total all unit-tested; empty state links to catalog |
| T9 | Mock checkout + commerce seam | Gina | Cloud | L | T8 | `createOrder()` seam in `src/lib/commerce.ts`; shipping form with inline validation; **no card input anywhere**; submit produces an order number, clears the cart, routes to confirmation; copy states no payment was taken |
| T10 | Confirmation page | Robin | Cloud | S | T9 | Order number, items, totals, shipping address; refresh-safe; "demo — nothing was charged and nothing will ship" copy; back-to-catalog link |
| T11 | E2E, a11y, deploy | Robin | Cloud + Desktop | L | T10 | Playwright golden path green in CI; axe-core zero critical violations on home/catalog/PDP/cart/checkout; preview URL live or local-run documented; README documents the Stripe swap |
| T12 | Real copy & prices | Rush | CLI | S | T2 | Confirmed tee/hoodie/cap prices and product copy in place; placeholder labels removed |
| T13 | Demonstration script & recording | Rush | Desktop | S | T11 | 3–5 minute recorded walkthrough of the golden path plus a written script for the live readout |
| T14 (opt) | Placement options & extra garments | Rush | Cloud | L | T11 | Placement (left chest / centre / back) selectable on tee and hoodie with live preview; or a fourth garment added purely through the matrix |
| T15 (opt) | Stripe test-mode checkout | Gina | Cloud + CLI | L | T11 | Behind `NEXT_PUBLIC_ENABLE_PAYMENTS`; test-card checkout completes; webhook drives order state; demo mode stays the default |

**Must-have total (T1–T11): ~4 sessions of Devin execution**, compressible to ~2.5 elapsed by running PRs 2–4 in parallel. T12–T13 are small and human-gated; T14–T15 add ~2.

Tickets can be filed in Linear with these acceptance criteria on request — name the team/project and Robin becomes the reporter on all of them.

## 8. Pull-Request Breakdown

Every PR is independently reviewable, leaves `main` deployable, and has one owner and one reviewer. Target size: under ~400 changed lines; anything larger gets split.

| PR | Title | Tickets | Owner | Reviewer | Scope boundary (what it deliberately excludes) |
|---|---|---|---|---|---|
| 1 | `chore: scaffold app and CI` | T1 | Gina | Robin | No product code — config, tokens, assets, CI only |
| 2 | `feat: product matrix data model` | T2 | Gina | Rush | Matrix generation and unit tests only, zero UI |
| 3 | `feat: app shell and demo banner` | T3 | Robin | Gina | Chrome only; pages stay stubs |
| 4 | `feat: mockup rendering engine` | T4 | Rush | Gina | Garment silhouettes + mark compositing on a dev-only contact-sheet route; not wired into product pages yet |
| 5 | `feat: home and catalog pages` | T5, T6 | Rush | Robin | No PDP; cards link to a stub route |
| 6 | `feat: product detail page and mark picker` | T7 | Rush | Gina | Add-to-cart calls a no-op stub from PR 3 |
| 7 | `feat: cart` | T8 | Robin | Rush | Real cart state and page; checkout still a stub |
| 8 | `feat: mock checkout and confirmation` | T9, T10 | Gina | Rush | The commerce seam; no real payment path |
| 9 | `test: e2e, a11y, and deploy config` | T11 | Robin | Gina | Tests and config only, no behaviour change |
| 10 | `content: real product copy and prices` | T12 | Rush | Robin | Data-only diff |
| 11+ | optional scope | T14, T15 | as assigned | as assigned | One PR per optional item |

**Sequencing.** PRs 2, 3, 4 run in parallel after PR 1 merges (disjoint files, three different owners). PRs 5→6→7→8 are sequential — each builds on the surface below it. PR 9 lands last against the finished flow.

**Keeping PRs reviewable.** Stubs are the mechanism: each PR introduces the interface the next one fills in (PR 3 ships a no-op `addToCart`, PR 7 makes it real). That is what lets the flow be built in seven small PRs instead of two large ones.

## 9. Working Agreement — Status, Dependencies, Blockers

- **Board.** Robin maintains one board (Linear or GitHub Projects) with columns `Blocked / Ready / In progress / In review / Done`. A ticket moves to `In progress` when its Devin session starts and to `In review` when its PR opens — status is derived from the PR, never from memory.
- **Dependencies are declared on the ticket** using the `Depends on` column above. Nothing enters `Ready` until its dependencies are `Done`. T0 blocks everything; T2/T3/T4 block the page work; T8 blocks T9.
- **Blockers get raised the day they appear**, in the team channel, naming the ticket, who is blocked, and what is needed. External blockers currently live: repo/Vercel access (Gina), the real product list (Rush → Marketing), brand approval on generated mockups before anything is shared externally.
- **Review SLA:** one working day. A PR waiting longer than that is a blocker and gets raised as one.
- **Definition of "Done" per ticket:** PR merged, CI green, acceptance criteria demonstrably met (screenshot or test output linked in the PR).
- **Decisions get written down** in this doc — architecture decisions by Gina, scope decisions by Rush — so the readout matches what was actually built.

## 10. Re-Scoping Triggers

The demonstration is the deliverable; anything that threatens it gets cut. Agreed triggers, decided by Rush with Gina:

| Trigger | Action |
|---|---|
| Any PR exceeds ~400 lines or two sessions | Split it; PR 7 splits into cart state vs. cart page, PR 8 into checkout form vs. confirmation |
| The must-have set is not on track with a third of the time left | Cut in this order: PR 9 e2e → PR 4 rich mockups (fall back to flat colour tiles) → PR 6 size chart and gallery |
| The real product list has not arrived | Ship with clearly-labelled placeholder copy; do not block the demo |
| Otter cannot be made to read well on black | Restrict the otter to the white colourway — the matrix supports per-mark colour availability |
| Vercel access does not materialise | Demo runs locally from the CLI; drop DoD item 8's hosted-URL requirement |
| Mockup quality is not brand-acceptable | Fall back to wordmark-on-colour tiles; the mockup component is isolated for exactly this reason |
| Anyone proposes real payments before T11 | Declined — it is optional scope T15 and lives behind the seam |

Cuts come out of *fidelity*, never out of the golden path: the browse → cart → checkout → confirmation flow ships even in the worst case.

## 11. Coaching Asks for the DEs

Queued questions rather than guesses, one per topic:
1. **Technical (Gina):** is the single `createOrder()` seam the right abstraction for "demo now, Stripe later", or is a thin API-route boundary a better shape even with no backend?
2. **Task scoping (Robin):** are nine must-have PRs the right granularity for a team of three, or does the stub-interface pattern create more review overhead than it saves?
3. **Prompting (all):** best practice for handing a ticket's acceptance criteria to a Cloud session so the PR comes back matching them without a second round trip.
4. **Product usage (all):** the right division between parallel child sessions and one long session for PRs 2–4, and how to keep three concurrent sessions from colliding on the same files.

## 12. Immediate Next Steps

| # | Action | Owner | Unblocks |
|---|---|---|---|
| 1 | Branch protection on `main`; confirm or decline Vercel | Gina | Merges, T11 |
| 2 | Approve this plan's scope, the 3×2×3 matrix, and the DoD | Rush | T1 |
| 3 | File T0–T15 with these acceptance criteria; stand up the board | Robin | Tracking |
| 4 | Confirm tee / hoodie / cap prices | Rush | T12 |
| 5 | On approval: PR 1, then PRs 2–4 in parallel | Gina / Rush / Robin | The build |

### Current state
- Brand assets pulled from the Drive press kit: Cognition and Devin wordmarks and avatars (SVG + PNG, black and white), four sticker artworks (PDF), two Devin interface screenshots. Monochrome kit, **no product photography** — the reason M6/T4 exists. The otter mascot is not in the kit — supplied separately by Robin and committed at `assets/brand/mark-otter.png`.
- No implementation work has been done. An exploratory Next.js scaffold exists on the Devin VM only; it is reference material, and PR 1 starts clean in this repo.
