# Frontend Supabase Integration — Slice 4: Real Grocery Persistence

Builds on `docs/AUTH_INTEGRATION.md` (Slice 1), `docs/HOUSEHOLD_INTEGRATION.md`
(Slice 2), and `docs/MEMBER_INTEGRATION.md` (Slice 3). Covers **only**
grocery persistence: `grocery_items` and `grocery_item_consumers`. The
settlement engine's own math, Analytics/History, and Payments are all
still local/mock or deferred — see "What remains local/mock" below.

After this slice: AUTH/PROFILE/HOUSEHOLD/MEMBERS/GROCERIES are all real
Supabase data; the settlement engine is the same deterministic local
domain engine, now fed from persisted data instead of mock state.

## Architecture

```
<HouseholdProvider>                     Slice 2, unchanged
  const groceries = useGroceries()      src/hooks/useGroceries.ts — rewritten wrapper
    └─ useHouseholdGroceries()          src/groceries/useHouseholdGroceries.ts — new, real hook
  ...prop-threaded into GroceriesPage/AssistantPage/SettlementsPage
```

Same split as Slice 3's members: `useHouseholdGroceries` is the real,
Supabase-backed hook (query, add, edit, delete); `useGroceries` wraps it
and keeps owning the page-local UI state (add/edit panel, delete/undo
timing) that already lived there, so `GroceriesPage`/`App.tsx` needed
minimal call-site changes. Neither gets a Context — exactly like members,
groceries are only ever needed by pages `App.tsx` already prop-threads.

## Files created

- `src/groceries/types.ts` — `GroceryItemRow`/`GroceryConsumerRow` (raw DB
  rows) and `mapGroceryItemRow()`/`groupConsumersByGroceryItem()`.
- `src/groceries/errors.ts` — `normalizeGroceryError()`, same pattern as
  `src/members/errors.ts`.
- `src/groceries/useHouseholdGroceries.ts` — the real hook: query,
  `addGrocery`, `editGrocery`, `deleteGrocery`.
- `src/groceries/useHouseholdGroceries.test.tsx`,
  `src/hooks/useGroceries.test.tsx` — unit tests.
- `tests/e2e/grocery-persistence.spec.ts` — new E2E coverage.
- `docs/GROCERY_INTEGRATION.md` — this file.

## Files modified

- `src/types/grocery.ts` — `GroceryItem.paidBy`/`sharedBy` (display names)
  replaced with `paidByMemberId`/`sharedByMemberIds` (real
  `household_members.id` values) plus a new `createdByMemberId`. `price`
  stays a decimal string, unchanged — see "Grocery identity model" below.
- `src/adapters/parseMoneyInput.ts` — added `formatMinorUnitsInput()`, the
  exact inverse of `parseMoneyInput`, for turning a persisted
  `amount_minor` back into the decimal string every display/form
  component already expects.
- `src/adapters/toEngineInput.ts` — grocery member references are read
  directly as ids now (no more name resolution for groceries); **critical
  fix**: always feeds the engine `quantity: 1`, since `amount_minor` is
  already the line's final total — see "Settlement-engine compatibility".
- `src/hooks/useGroceries.ts` — rewritten around `useHouseholdGroceries`;
  delete/undo redesigned around real persistence (see "Delete/undo
  behavior"); `addGenerated` now persists through the same `addGrocery`
  path, sequentially.
- `src/features/groceries/GroceryCard.tsx` — takes a `memberNameById`
  resolver prop (ids → display names, including archived) and a `canEdit`
  prop gating the Edit/Delete controls.
- `src/features/groceries/GroceryForm.tsx` — id-based drafts; async
  submit with loading/error state (mirroring Slice 3's `AddMemberDialog`);
  new price validation (see "What changed vs. the old mock form").
- `src/features/groceries/GroceriesPage.tsx` — surfaces loading/error
  states; computes `canEdit`/`memberNameById` for each card; shows a
  delete-finalize-failure toast.
- `src/features/assistant/GeneratedGroceries.tsx`,
  `src/store/assistantGenerated.ts` — id-based drafts; mock generated
  items no longer pre-fill any payer/sharers (a mock "AI" can't know real
  member ids any more than it could know real member names).
- `src/features/assistant/AssistantPage.tsx`, `src/App.tsx` — `onAddGroceries`
  is now async, returning `{error?: string}`; navigation to Groceries
  only happens once persistence is confirmed.
- `src/store/groceries.ts`, `src/services/settingsExportService.ts` —
  minimal rename-only fix (`paidBy` → `paidByMemberId`) to keep compiling;
  this mock export feature is untouched otherwise, out of this slice's scope.
- Five existing Playwright specs — see "Playwright result" below.

## Grocery query strategy

`loadGroceries()` runs two RLS-gated queries for the current real
household: `grocery_items` filtered by `household_id`, then
`grocery_item_consumers` filtered by the same `household_id`, grouped
client-side by `grocery_item_id`. Two queries rather than one PostgREST
embed, deliberately: it makes the **partial relation error** case
explicit and testable — if the items query succeeds but the consumers
query fails, the whole load is treated as a failure (never a fabricated
empty consumer list for every item), rather than depending on how a
combined embedded query happens to report a partial failure.

## Grocery identity model

Every operation is keyed by real, persisted ids — `paidByMemberId`,
`sharedByMemberIds`, and `createdByMemberId` are all `household_members.id`
values, never display names. `GroceryItem.price` deliberately stays a
decimal string (e.g. `"49.99"`), not `amountMinor: number` — this is the
one place the UI-facing type didn't move fully to the "raw persisted
value" shape, because every existing display component (`GroceryCard`,
`AnimatedNumber`, money-display tests) already reads it that way, and
"do not redesign the UI" meant preserving that contract. The
integer-minor-units value only ever exists at the persistence boundary
(`useHouseholdGroceries`), converted via `parseMoneyInput`/
`formatMinorUnitsInput`.

## Owner behavior

N/A to this slice directly — grocery edit/delete permission is
creator-or-owner (see Migration 3), not owner-only. `created_by_member_id`
is always the *caller's own* membership id (RLS enforces this — see
`grocery_items_insert_active_member`'s `created_by_member_id =
private.household_member_id_for(household_id)` check), never a
client-supplied value and never necessarily the same as the payer.

## Create flow

`addGrocery` validates client-side (name, a parseable price, a chosen
payer, at least one sharer — see `validateDraft`), then inserts the
`grocery_items` row (deriving `created_by_member_id` from the caller's
own membership, never trusting anything the client could claim), then
inserts one `grocery_item_consumers` row per selected sharer.

## Consumer write strategy

**Create**: one bulk `insert` of every selected sharer's consumer row,
right after the item itself is confirmed inserted.

**Edit**: a *diff*, not a blind delete-all-then-insert-all — the existing
consumer set is read back, then only the genuinely new ids are inserted
and only the genuinely removed ids are deleted. Unchanged consumers are
never touched at all, which also means a partial failure here can never
leave the item with *zero* consumers (the failure mode a blind
replace-everything strategy would risk).

## Partial-failure strategy

No RPC/transaction is available this slice (none was created, per
scope), so there is no real atomicity across the item insert and its
consumer inserts — this is a client-driven compensating action, not a
database guarantee, and that residual risk is real and documented, not
hidden:

- **Create**: if the consumer insert fails after the item insert
  succeeded, the client immediately deletes the just-created
  `grocery_items` row rather than leaving a payer-but-no-sharers record
  behind. If *that* rollback call itself fails (a second, independent
  network error right after the first), an orphaned consumer-less
  `grocery_items` row can be left behind — a known, narrow residual
  window that only an RPC could close, and creating one was out of
  scope for this slice.
- **Edit**: the item's own field update is a single atomic UPDATE. The
  consumer diff runs after it succeeds; if the diff partially fails, the
  item's own fields are already correctly saved, and the failure is
  reported to the user as an edit failure (never silently treated as a
  full success) — the item's consumers may be temporarily stale, fixable
  by retrying the edit.

## Edit flow

Same creator-or-owner RLS as delete (`grocery_items_update_creator_or_owner`).
`household_id` and `created_by_member_id` are immutable — not in the
UPDATE grant's column list at all, so Postgres rejects any attempt to
change them before RLS is even consulted. An RLS-denied edit doesn't
throw; the UPDATE just affects zero rows, detected via
`.select('id').maybeSingle()` returning `null` (same pattern as Slice 3's
member archive/reactivate).

## Delete/undo behavior

Deleting **never calls Supabase immediately**. The item is optimistically
hidden from the visible list for a 5-second undo window; Undo during that
window is a pure client-side cancel (nothing was ever persisted, so
there's nothing to restore and no way to double-restore). The real,
persisted `DELETE` only fires once the window closes (or the toast is
dismissed early) — `grocery_item_consumers` rows cascade-delete with it
automatically (Migration 2's `ON DELETE CASCADE`). If that real delete
fails, the item simply reappears (it's still genuinely persisted) and a
plain toast explains why, rather than silently leaving it hidden while
still real. A page refresh *during* the undo window shows the item again
— correct and truthful, since the server was never actually asked to
delete it yet.

## Assistant integration

Approved generated items persist through the exact same `addGrocery`
call manual entry uses (`useGroceries.addGenerated`), one at a time,
sequentially — no second persistence pathway. Every mock generated item
now ships with no payer/sharers pre-filled at all (a mock "AI" has no way
to know a real household's actual member ids), so the review step's
existing "never guess who paid or shared" gate is what's actually being
exercised, not a shortcut around it.

## Archived-member behavior

Identical policy to Slice 3's roster page: archived members are excluded
from `useMemberOptions`'s selectable list (so a **new** grocery's payer/
sharer pickers never offer them), but a grocery that already references
an archived member keeps resolving and displaying their real name — the
`memberNameById` resolver `GroceriesPage` builds is deliberately drawn
from the **full** roster (not the selectable-only list), with a
`"Unknown member"` fallback only for a genuinely missing/unreachable id
(never triggered by archival itself).

## Settlement-engine compatibility

Math unchanged; the engine still only ever sees ids, a `Money` amount,
and consumer ids — real UUIDs now, opaque strings either way as far as
`calculateMemberBalances` is concerned. The one adapter-layer change
that mattered: `docs/SUPABASE_SCHEMA_DESIGN.md`'s own "Engine
reconstruction" section (written back at Migration 2, before any
frontend integration existed) already specifies that `amount_minor` is
the line's *final total*, and that feeding the engine the stored
(decorative-only) `quantity` back in would double-count it. `toEngineInput`
now always passes the engine `quantity: 1`, matching that — the *old*
mock-era code multiplied `unitPrice × quantity`, which would have been
wrong the moment real data arrived. Caught and fixed proactively, with a
dedicated unit test (`toEngineInput.test.ts`) asserting a quantity-5 item
still consumes exactly its one persisted total, not five times it.

## Refresh persistence

Verified directly (both in Playwright and by design): add → refresh →
persists; edit → refresh → changes persist; delete (window closed) →
refresh → stays gone; delete + Undo → refresh → stays restored (nothing
was ever sent to the server to begin with). No `localStorage` is ever the
source of truth for groceries — `useHouseholdGroceries` always re-derives
`items` from a live Supabase query.

## User/household-switch safety

`useHouseholdGroceries` resets its state **during render** on any
household-id change — the identical pattern already proven in
`useHouseholdMembers`/`HouseholdProvider` — so a household switch or
sign-out can never render the previous household's groceries, even for
one frame.

## What changed vs. the old mock form

A blank price used to be silently accepted (it just displayed as if the
item were free). A real, persisted `amount_minor` can't represent "no
price entered" — leaving it blank would silently understate real
spending, exactly the kind of guess this codebase avoids everywhere else
(member-name resolution, settlement calculation). `GroceryForm` now
validates price the same way it already validated name/payer/sharers —
a proper inline error (`"Enter a valid price."`), not a silent default to
zero, and not a redesign: it's one more instance of the same existing
validation pattern.

## Unit tests

- `src/groceries/useHouseholdGroceries.test.tsx` (16 tests): query/consumer
  mapping, amount_minor round-trip, partial relation error, add success,
  add price-validation short-circuit, add rollback on consumer-insert
  failure, edit success/RLS-denial, delete success/RLS-denial,
  household-switch reset, no-household idle state.
- `src/hooks/useGroceries.test.tsx` (13 tests): delete/undo timing
  (hide-without-network, undo-without-network, real-delete-on-window-close,
  dismiss-finalizes-early, duplicate-undo-is-a-no-op,
  rapid-double-delete-is-a-no-op, finalize-failure surfaces `deleteError`),
  add/edit submit delegation and error propagation, sequential
  `addGenerated` with partial-failure aggregation.
- `src/adapters/toEngineInput.test.ts` — added the quantity-fix-at-1
  regression test described above; removed the now-inapplicable
  name-resolution error tests (grocery items no longer resolve names at
  all in the live path).
- `src/adapters/parseMoneyInput.test.ts` — added `formatMinorUnitsInput`
  coverage, including an exact round-trip property check.

## Playwright result

`npx playwright test --workers=1`: **72 passed, 30 skipped (mobile-skip
convention), 0 failed**, against a freshly reset local Supabase database.

Notable fixes along the way:

- `helpers.ts` gained `clearHouseholdGroceries()` — a direct, RLS-gated
  REST call (the signed-in browser session's own JWT + anon key, never
  service_role) that wipes every grocery for the current household.
  **Required** before either exact-settlement-math spec
  (`settlement-integration.spec.ts`, `new-member-settlement.spec.ts`):
  groceries now genuinely persist in the shared, long-lived fixture
  household, so "fresh page load ⇒ empty grocery list" (true for Slice
  1–3's ephemeral session state) no longer holds — without a clean slate,
  leftover groceries from any other spec would silently change the
  expected balances. This is a **correctness requirement for
  `--workers=1`, not just a convenience**: under parallel workers, one
  spec's clear-and-add sequence can race another spec's own grocery
  writes to the same shared household, which is exactly the scenario
  `--workers=1` exists to rule out for a shared-fixture design like this
  one.
- `grocery-delete-undo.spec.ts`'s fixed item names ("Milk (2L)",
  "Basmati rice (5kg)") became per-run-unique — the same "groceries now
  persist forever" reasoning applies to a fixed name colliding with a
  leftover row.
- Mixing Playwright's fake `page.clock` with the delete finalize's *real*
  network call was itself a source of flakiness; the "stays deleted"
  test now waits out the real (short) window instead.
- A genuinely new bug, not a test artifact: `GroceryForm` had no price
  validation at all before this slice (a blank price silently became
  "free"). Two existing specs relied on that gap; both now fill in a
  real price, and the form itself gained the validation described above.
- `archiveMember()` (a new `helpers.ts` addition) had to stop checking
  for "Archived" *inside* the member profile drawer — `useMembers.
  handleRemove` already closes the drawer on a successful archive
  (Slice 3 behavior, unchanged); the real confirmation is the member's
  own card showing the badge afterward.
- Escape-to-close a `Dropdown` popover inside the "Add grocery" `Drawer`
  also closes the whole Drawer (Escape bubbles past the dropdown's own
  outside-click handling to the Drawer's document-level listener) — a
  pre-existing quirk, newly hit by this slice's own archived-member test;
  worked around by clicking a neutral element instead of pressing Escape.

## Hosted verification

Not yet performed — pending explicit go-ahead, consistent with every
other hosted step in this engagement being separately authorized before
running (see Slice 3's own hosted-verification phase for the identical
pattern, including the Admin-API account-provisioning approach hosted
`grocerymate-dev`'s email-confirmation requirement makes necessary).

## Security review

- No `service_role` usage anywhere in `src/groceries/` or the code paths
  it touches.
- `created_by_member_id` is never client-controllable in practice — RLS's
  `grocery_items_insert_active_member` policy independently re-derives it
  server-side from `auth.uid()` and rejects any insert where the claimed
  value doesn't match, regardless of what the client sent.
- `household_id`/`created_by_member_id` are excluded from the UPDATE
  grant entirely — immutable at the database level, not just hidden in
  the UI.
- No hard `DELETE` bypassing RLS anywhere; every write path is a normal
  RLS-gated REST call through the same browser client the rest of the
  app uses.
- No cross-household consumer possible even before RLS is considered —
  Migration 2's composite FKs on `grocery_item_consumers` refuse a
  mismatched `household_id` at the schema level.

## Typecheck/lint/build

All clean. Typecheck: 0 errors. Lint: 0 errors, the same 6 pre-existing
`react-refresh/only-export-components` warnings, unrelated to this
slice. Production build: succeeds; the existing "chunks larger than
500kB" advisory is pre-existing and unrelated.

## What remains local/mock

- Analytics/History/Settings-export: unchanged, still their own fixed
  mock data, independent of real groceries or members.
- Settlement engine: still a deterministic local calculation over
  whatever grocery data currently exists — never persisted itself
  (a settlement is derived, not stored).
- Payments ("Mark as paid"): not implemented — clicking it has no
  persistence effect this slice.
- Invitation email delivery, invite acceptance, household switching,
  account deletion, ownership transfer: unchanged from Slice 3, still
  out of scope.

## Blockers before Slice 5

- The Slice 3 owner-self-archival RLS gap (see `docs/MEMBER_INTEGRATION.md`)
  is still unresolved and still relevant here too: an archived owner's
  historical groceries remain correctly readable, but the underlying
  "never fewer than one owner" invariant is still UI-only, not
  DB-enforced.
- No RPC exists for atomic grocery+consumer writes — a real (if narrow)
  partial-write risk on both create and edit, documented above. Worth
  revisiting once a migration is back in scope.
- Marking a settlement transfer "paid" still has no persistence model at
  all; that's the natural next integration seam once this slice is
  accepted.
