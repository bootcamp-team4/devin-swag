# Cognition Merch Store — Project Plan (v2)

Scope locked with Robin on 2026-08-24:
public storefront · **no real payments** · **no inventory/fulfillment** · demo application · built from scratch · brand assets from the Cognition press kit · new repo (provided by Gina).

---

## 1. Target User & Problem

**Primary user — "the fan/visitor."** Someone who lands on the store from a Cognition link, a conference QR code, or a Devin session and wants to see what merch exists and what it would cost. Today there is no such surface: merch appears ad hoc at events and in DMs, so there is nowhere to point people, no consistent product presentation, and no way to gauge interest.

**Secondary user — "the internal stakeholder."** Marketing/DevRel who needs to show what a Cognition store would look and feel like — in a deck, a demo, or a stakeholder review — before anyone commits to a payment processor, a print vendor, or inventory.

**Problem statement.** There is no branded, shareable storefront for Cognition merch. This project delivers the complete shopping *experience* — browse, inspect, configure, cart, checkout flow — without the commerce backend, so the concept can be evaluated and demoed now and turned into a real store later by swapping in payments and fulfillment.

**Explicit non-problem.** This release is not trying to sell anything, take money, track stock, or ship a package.

## 2. Product Goal & Definition of Done

**Goal:** a fast, on-brand, fully navigable demo storefront that a visitor can use end to end — from landing page to an order-confirmation screen — where the only thing that isn't real is the transaction.

**Definition of done.** All must be true:

1. A visitor can complete the golden path unaided: home → catalog → product detail → pick variant → add to cart → cart → checkout form → confirmation screen with an order number.
2. Catalog contains ≥10 products across ≥4 categories, each with variants (size/colour where applicable), price, description, and generated mockup imagery using real press-kit assets.
3. Cart persists across page reloads and browser restarts.
4. Every "purchase" surface is unmistakably a demo: a persistent banner/label states no payment is taken and no order is fulfilled; the checkout form accepts no card data.
5. Responsive from 360px to desktop; keyboard-navigable golden path; no axe-core critical violations on catalog, PDP, cart, checkout.
6. `npm run lint`, `tsc --noEmit`, and `npm run build` pass clean in CI on every PR.
7. Playwright e2e covering the golden path passes in CI.
8. Deployed to a shareable preview URL, and the repo README explains how to run it and how to swap the mock checkout for a real one.
9. Lighthouse ≥90 performance and ≥95 accessibility on the catalog page.

**Anti-goals (explicitly not done):** payment processing, real inventory, user accounts, admin CMS, email, analytics vendor, print vendor integration.

## 3. Scope

### Must-have (M)
| ID | Feature | Notes |
|---|---|---|
| M1 | Design system & app shell | Monochrome brand tokens, type scale, header with cart badge, footer, demo banner |
| M2 | Product catalog data model | Typed static data module — products, variants, categories, price in integer cents |
| M3 | Home page | Hero with wordmark, featured products, category entry points |
| M4 | Catalog page | Grid, category filter, text search, sort by price, empty state — filter state in the URL |
| M5 | Product detail page | Gallery, variant picker (size/colour), price, description, size chart, add-to-cart, out-of-stock states |
| M6 | Product mockup imagery | Generated SVG mockups per product type, composited with press-kit marks |
| M7 | Cart | Persistent (localStorage), qty edit, remove, subtotal/shipping/tax estimate, empty state |
| M8 | Mock checkout | Shipping-details form with validation, order summary, no payment fields, "Place demo order" |
| M9 | Confirmation | Generated order number, order recap, clear "this is a demo" copy, back-to-catalog |
| M10 | Responsive & a11y pass | 360px→desktop, focus states, labels, semantic landmarks |
| M11 | CI, tests, deploy | Lint/typecheck/build/e2e in CI; preview deploy; README |

### Optional / stretch (O) — only after every M lands
| ID | Feature |
|---|---|
| O1 | Product configurator: choose mark (Cognition vs. Devin) and placement, live mockup preview |
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
- **Imagery generated in-repo.** The press kit contains wordmarks, avatars, and sticker art — no product photography — so each product renders a deterministic SVG mockup (garment/object silhouette + press-kit mark) rather than shipping stock photos.
- **Testing:** Playwright for the golden path, Vitest for cart/price maths, axe-core in the a11y test.
- **CI:** GitHub Actions — lint, typecheck, build, unit, e2e on every PR.
- **Hosting:** Vercel preview per PR + a production preview URL. *Requires the user's/org's Vercel account — I will not deploy to a personal account.*

**Key design decision — the "commerce seam."** All cart/checkout side effects go through one module (`src/lib/commerce.ts`) exposing `createOrder(cart, details)`. The demo implementation returns a fake order synchronously. Swapping in Stripe later means replacing that one function and its call sites, not rewriting the flow. This is what makes O8 cheap and keeps the demo honest about what it is.

**Dependencies (technical):** `next`, `react`, `tailwindcss`, `@playwright/test`, `vitest`, `@axe-core/playwright`. Nothing else — no UI kit, no state library. Every dependency pinned to a version published ≥7 days before adoption.

**Dependencies (external, blocking):**
| Dependency | Owner | Needed by |
|---|---|---|
| New empty repo + write access | Gina | T1 (day one) |
| Product list: which items, prices, copy | Robin/Marketing | T2 — placeholders used until then |
| Vercel account/team for deploys | Robin | T11 |
| Brand approval on generated mockups | Marketing | before external sharing |

**Major risks:**
| Risk | Impact | Mitigation |
|---|---|---|
| No product photography exists | Store looks unfinished; blocks external sharing | Generated SVG mockups (M6); treat photography as a later swap behind one component |
| Demo mistaken for a real store — someone tries to buy | Trust/support problem | M4 of DoD: persistent demo banner, no card fields, confirmation copy states nothing was charged |
| Brand misuse of press-kit assets | Marketing rework | Use assets unmodified, monochrome palette only; brand review before external sharing |
| Fake prices/product names leak into a public deck as fact | Misleading stakeholders | Label placeholder copy in the UI until Marketing supplies the real list |
| Repo not provided in time | Idle work | Build on a local branch; push as soon as the repo exists (already the current fallback) |
| Scope creep toward real commerce | Blows the demo timebox | O8 is explicitly optional and gated behind the commerce seam |

## 5. Tickets

Owner column: **Devin** = me; **Robin/Gina/Marketing** = human-owned. Estimates are in Devin sessions (S ≈ ¼ session, M ≈ ½, L ≈ 1).

| ID | Title | Owner | Est | Acceptance criteria |
|---|---|---|---|---|
| T0 | Provide repo + Vercel access | Gina / Robin | — | Empty repo exists with Devin as a collaborator; Vercel project connected |
| T1 | Scaffold app, CI, brand tokens | Devin | M | Next.js 16 + TS + Tailwind app builds; lint/typecheck/build wired in GitHub Actions and green; brand assets committed under `public/brand`; monochrome tokens defined; README with run instructions |
| T2 | Catalog data model + seed products | Devin | M | `src/lib/products.ts` exports typed `Product`/`Variant`; ≥10 products across ≥4 categories; prices integer cents; unit tests for lookup/price helpers pass; placeholder copy clearly marked |
| T3 | App shell: header, footer, demo banner | Devin | S | Header with logo, nav, cart badge reflecting item count; footer; dismissible-but-persistent demo banner on every page; responsive at 360px; keyboard-navigable |
| T4 | Product mockup imagery | Devin | M | Every product renders a distinct mockup at list and detail sizes; press-kit marks used unmodified; no external image requests; alt text on every image |
| T5 | Home page | Devin | S | Hero, ≥4 featured products linking to PDPs, category tiles linking to filtered catalog; passes Lighthouse ≥90/95 |
| T6 | Catalog page: grid, filter, search, sort | Devin | M | Category filter, text search, price sort; state reflected in URL and survives refresh/share; empty state with a reset action; results count announced to screen readers |
| T7 | Product detail page | Devin | L | Variant picker updates price and availability; out-of-stock variants disabled with explanatory text; size chart for apparel; add-to-cart gives visible feedback; deep link per product with correct metadata/title |
| T8 | Cart | Devin | M | Add/update-qty/remove work; persists across reload and restart; subtotal, shipping estimate, tax estimate, total correct per unit tests; empty state links to catalog |
| T9 | Mock checkout + commerce seam | Devin | L | `createOrder()` seam in `src/lib/commerce.ts`; shipping form with inline validation; no card input anywhere; submitting produces an order number, clears the cart, and routes to confirmation; copy states no payment was taken |
| T10 | Confirmation page | Devin | S | Shows order number, items, totals, shipping address; refresh-safe; "this is a demo, nothing was charged and nothing will ship" copy; back-to-catalog link |
| T11 | Tests, a11y, deploy | Devin | L | Playwright golden-path spec green in CI; axe-core scan with zero critical violations on 4 key pages; Vercel preview URL live; README documents the Stripe swap |
| T12 | Real product copy & prices | Marketing → Devin | S | Placeholder products replaced with the approved list; placeholder labels removed |
| T13 (opt) | Product configurator | Devin | L | Mark and placement selectable on ≥3 apparel products; mockup preview updates live; selection carried into cart line and confirmation |
| T14 (opt) | Stripe test-mode checkout | Devin | L | Behind `NEXT_PUBLIC_ENABLE_PAYMENTS`; test-card checkout completes; webhook updates order state; demo mode remains the default |

**Total for must-have (T1–T11): ~4 sessions.** T12 is gated on Marketing; T13–T14 add ~2 more.

I can file T1–T14 in Linear (or GitHub Issues) with these acceptance criteria on request — say the word and name the team/project.

## 6. Pull-Request Breakdown

Each PR is independently reviewable, leaves `main` deployable, and maps to one or two tickets.

| PR | Title | Tickets | Contents |
|---|---|---|---|
| 1 | `chore: scaffold app and CI` | T1 | Next.js app, Tailwind tokens, brand assets, GitHub Actions, README |
| 2 | `feat: catalog data model` | T2 | Typed products/variants module + unit tests. No UI. |
| 3 | `feat: app shell and demo banner` | T3 | Header/footer/banner, layout, cart-count placeholder wiring |
| 4 | `feat: product mockup artwork` | T4 | Mockup component + per-product artwork; visual smoke test |
| 5 | `feat: catalog and home pages` | T5, T6 | Home, catalog grid, filter/search/sort with URL state |
| 6 | `feat: product detail page` | T7 | PDP, variant picker, size chart, metadata |
| 7 | `feat: cart` | T8 | Cart context + persistence + cart page + totals tests |
| 8 | `feat: mock checkout and confirmation` | T9, T10 | Commerce seam, checkout form, confirmation page |
| 9 | `test: e2e, a11y, and deploy config` | T11 | Playwright golden path, axe scan, Vercel config, README swap guide |
| 10+ | optional-scope PRs | T12–T14 | One PR per optional item |

Ordering note: PRs 2–4 are parallelizable (independent files); 5–8 are sequential because each builds on the previous surface. I would run PRs 2 and 4 as child sessions in parallel with PR 3 if you want to compress the timeline.

## 7. Where the Work Runs — CLI / Desktop / Cloud

| Surface | What runs there | Why |
|---|---|---|
| **Cloud (Devin sessions, this one)** | Default for everything: scaffolding, all feature PRs, tests, CI fixes, and the parallel child sessions for PRs 2–4 | Long-running, reviewable, produces PRs; no local machine needed; parallelizable |
| **Desktop (Devin's VM GUI + browser)** | Visual verification of every UI PR, responsive checks at 360/768/1280, the recorded golden-path walkthrough for stakeholder review, brand-asset retrieval from Drive (already done) | These need a real browser and real screenshots — the recording is the demo artifact Marketing can circulate |
| **CLI (Devin CLI on a human's machine)** | Robin/Gina running the store locally (`npm run dev`) for hands-on review; quick copy/price edits to `products.ts`; adding real product data in T12 | Fastest loop for a human who wants to poke at it or tweak copy without waiting on a session |

Concretely: I build and PR in **Cloud**, verify and record in **Desktop**, and hand you a **CLI** path for local review and content edits.

## 8. Immediate Next Steps

1. Gina: create the repo and add me as a collaborator (unblocks everything).
2. Robin: confirm the Vercel account for previews, or say "no deploy" and I'll ship it as a local-run demo only.
3. Marketing: product list, prices, and copy when convenient — placeholders until then.
4. On your go-ahead: I file T1–T14 as tickets, then start PR 1.

### Current state of my machine
- Brand assets pulled from the Drive press kit into `/home/ubuntu/brand` — Cognition and Devin wordmarks and avatars (SVG + PNG, black and white), four sticker artworks (PDF), two Devin interface screenshots. It is a monochrome kit; there is **no product photography**, which is why M6 exists.
- A throwaway Next.js 16 scaffold with the catalog data model and cart logic exists locally from the earlier build attempt. It is not committed anywhere and I will treat it as a reference, not as delivered work — PR 1 starts clean in your repo.
