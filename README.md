# GroceryMate

Split household groceries fairly: log what's bought, who paid, and who shares
it, and GroceryMate works out who owes whom — with the minimum number of
payments to settle up. React 19 + Vite + TypeScript (strict) + Tailwind v4 +
Framer Motion, installable as a PWA. Auth/session/profile and the current
household's identity are real (Supabase); member/grocery/settlement data is
still local/mock — see [docs/AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md)
and [docs/HOUSEHOLD_INTEGRATION.md](docs/HOUSEHOLD_INTEGRATION.md).

## Quickstart

```bash
npm install
npm run dev
```

Open the printed local URL. The Settings gear in the sidebar, and `/#design-system`
(append the hash to the URL) for the internal component/design-token reference.

## Scripts

| Script                            | What it does                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server.                                                                                                                            |
| `npm run build`                   | Typecheck (`tsc -b`) then production build.                                                                                                           |
| `npm run preview`                 | Serve the production build locally — use this (not `dev`) to check PWA/offline behavior, since the service worker only registers against a built app. |
| `npm run typecheck`               | Typecheck only, no build.                                                                                                                             |
| `npm run lint`                    | ESLint across the whole project.                                                                                                                      |
| `npm run format` / `format:check` | Prettier, write or check-only.                                                                                                                        |
| `npm run test`                    | Run the test suite once.                                                                                                                              |
| `npm run test:watch`              | Run tests in watch mode.                                                                                                                              |
| `npm run test:coverage`           | Run tests with a coverage report.                                                                                                                     |

## Architecture — two layers, deliberately not yet connected

GroceryMate was built in phases, and the codebase reflects that honestly
rather than pretending it's more integrated than it is:

- **The UI layer** — `src/features/*` (one folder per page), `src/components/*`
  (shared UI/layout/experience pieces), `src/hooks/*` (each feature's state),
  `src/store/*` (mock seed data), `src/types/*` (display-only types, e.g.
  `GroceryItem.price` is a plain string). This is what actually renders —
  every page runs on in-memory mock state that resets on reload.
- **The engineering layer** — production-quality, independently tested
  modules with zero React dependency:
  - `src/domain/` — branded-id, discriminated-union entities (`Money` in
    integer minor units, never floating point).
  - `src/engine/` — the deterministic settlement algorithm: who spent what,
    who consumed what, and the minimum-transaction payoff plan.
  - `src/persistence/` — a `localStorage`-backed session repository.
  - `src/ai/` — a vendor-agnostic AI grocery-parser abstraction (Claude/
    OpenAI/Gemini/fake), with strict allow-list validation so a model can
    never inject a calculated financial value.
  - `src/ocr/`, `src/receiptPipeline/` — the receipt-scanning pipeline
    architecture (OCR → cleanup → parse → confirm), partially stubbed.
  - `src/fairness/` — deterministic "why do I owe this?" fact-building,
    with an AI phrasing layer that's verified against the real numbers
    before it's ever shown, and a template fallback that can't be wrong.

All 230+ tests under `src/{domain,engine,persistence,ai,ocr,receiptPipeline,fairness}`
exercise this second layer. Wiring the UI to it is a real, future integration
task, not something to assume is already done from the file tree.

See [DESIGN.md](DESIGN.md) for the visual design system (color/type/motion tokens
and usage rules).

## A note on the TypeScript version

`typescript` is pinned to `6.0.3` rather than the newer `7.x` line: at the
time this tooling was set up, `typescript-eslint` (and therefore ESLint's
type-aware linting) does not yet support TypeScript 7's rewritten compiler
package, which no longer exposes the classic compiler API surface those
tools depend on. 6.0.3 is the last release before that rewrite. Revisit this
pin once `typescript-eslint` adds TS 7 support.

## Testing

```bash
npm run test
```

230+ tests cover the engineering layer (`domain`/`engine`/`persistence`/`ai`/
`ocr`/`receiptPipeline`/`fairness`) via Vitest. Most of the UI layer
(`features`/`hooks`/`components`) still has no automated tests; `src/auth/`
is the first exception, covered via `jsdom` + `@testing-library/react`
(`vite.config.ts`'s `test.environment` and `*.test.tsx` glob) with the
Supabase client mocked at the module boundary — see
[docs/AUTH_INTEGRATION.md](docs/AUTH_INTEGRATION.md).
