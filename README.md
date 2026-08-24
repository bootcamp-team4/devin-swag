# Cognition Merch Designer

Cognition Merch Designer is a browser-based tool for creating Cognition merch designs from a fixed set of brand marks and garments; it is a design tool, not a store.

## Run locally

```sh
npm install
npm run dev
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Typecheck and build the production bundle |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run test` | Run the Vitest test suite |
| `npm run preview` | Preview the production build locally |

Brand assets live in [`public/brand`](public/brand) and are exported as base64 data-URI constants in [`src/lib/marks.ts`](src/lib/marks.ts).

See the [project plan](docs/PROJECT_PLAN.md) for the complete product scope and implementation sequence.
