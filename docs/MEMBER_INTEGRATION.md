# Frontend Supabase Integration — Slice 3: Real Household Members

Builds on `docs/AUTH_INTEGRATION.md` (Slice 1) and `docs/HOUSEHOLD_INTEGRATION.md`
(Slice 2). Covers **only** member data: the roster itself (who's in the
household, their role/status/lifecycle timing) and its CRUD (add, invite,
archive, reactivate). Groceries and settlements are still local/mock —
see "What remains local/mock" below.

After this slice: AUTH = Supabase, PROFILE = Supabase, HOUSEHOLD =
Supabase, MEMBERS = Supabase, GROCERIES = still local, SETTLEMENTS =
still computed locally.

## Architecture

```
<AuthProvider>                  src/auth/ (Slice 1, unchanged)
  <HouseholdProvider>           src/household/ (Slice 2, unchanged)
    <BrowserRouter>
      <App>
        const members = useMembers()   src/hooks/useMembers.ts — rewritten
        ...prop-threaded into MembersPage/GroceriesPage/SettlementsPage/AssistantPage
```

Unlike Auth/Household, the roster deliberately does **not** get a
Context. It's only ever needed by pages `App.tsx` already prop-threads,
exactly like the mock `useMembers()` it replaces — a Context would be a
new pattern introduced for no new need. `src/members/useHouseholdMembers.ts`
is the real, Supabase-backed hook; `src/hooks/useMembers.ts` wraps it,
adding the page-local UI state (search/sort/dialog/profile-drawer) that
already lived there before this slice, so every existing call site
(`App.tsx`, `MembersPage`) keeps the exact same shape it already had.

## Files created

- `src/members/types.ts` — `HouseholdMemberRow` (raw DB row) and
  `mapHouseholdMemberRow()`, mapping a row to the existing UI-facing
  `Member` shape.
- `src/members/errors.ts` — `normalizeMemberError()`, mirroring
  `src/auth/errors.ts`/`src/household/errors.ts`'s pattern (log the raw
  error, return a generic safe message).
- `src/members/useHouseholdMembers.ts` — the real roster hook: query,
  `addMember`, `inviteMember`, `archiveMember`, `reactivateMember`.
- `src/members/useHouseholdMembers.test.tsx`, `src/hooks/useMembers.test.tsx` — unit tests.
- `docs/MEMBER_INTEGRATION.md` — this file.

## Files modified

- `src/hooks/useMembers.ts` — rewritten from a pure local-mock hook into
  a thin wrapper around `useHouseholdMembers()`.
- `src/hooks/useMemberOptions.ts` — selectable options now also exclude
  `'archived'` (previously only excluded `'invited'`).
- `src/types/member.ts`, `src/constants/memberStatus.ts`, `src/domain/Member.ts` —
  added the `'archived'` status/variant; `email` widened to `string | null`.
- `src/adapters/toEngineInput.ts` — `toDomainMember` rewritten from a
  ternary to an exhaustive switch (see "Local grocery compatibility"
  below); `householdId` threaded as an explicit parameter instead of a
  hardcoded `mockHousehold` import.
- `src/hooks/useSettlementResult.ts` — sources `householdId` from
  `useHousehold()` instead of the removed mock constant.
- `src/hooks/useGroceries.ts` — starts from an empty list instead of
  `src/store/groceries.ts`'s mock seed (see "Local grocery compatibility").
- `src/store/assistantGenerated.ts` — mock generated items no longer
  pre-fill `paidBy`/`sharedBy` with old mock-roster names.
- `src/features/groceries/GroceryForm.tsx` — default payer now resolved
  from the signed-in user's own `household_members.id`
  (`useHousehold().currentMembership`), not a `mockUser.name` match.
- `src/features/members/AddMemberDialog.tsx` — add/invite submission is
  now async, with a double-submit guard and an inline error banner.
- `src/features/members/MemberProfileDrawer.tsx` — new `onReactivate`/
  `isOwner` props; footer shows Reactivate for an archived member, Remove
  otherwise, and nothing at all for an owner's own row (see "Owner
  behavior").
- `src/features/members/MembersPage.tsx` — surfaces the roster's own
  loading/error state; gates "Add member"/"Invite" on `isOwner`.
- `tests/e2e/helpers.ts` — `enterApp` no longer assumes a pre-populated
  grocery list; added `addGrocery`/`addMember` helpers and
  `FIXTURE_OWNER_NAME`/`FIXTURE_OWNER_FIRST_NAME` constants.
- `tests/e2e/assistant-review.spec.ts`, `new-member-settlement.spec.ts`,
  `settlement-integration.spec.ts`, `grocery-delete-undo.spec.ts`,
  `nested-overlay-escape.spec.ts` — updated for real members/empty
  grocery seed (see "Local grocery compatibility" and the Playwright
  section below).

## Member query strategy

`loadRoster()` queries `household_members` filtered by
`.eq('household_id', <the current real household's id from useHousehold()>)`
— never an id sourced from routing or `localStorage`, and never
unfiltered. This returns the **whole roster** (every member, not just the
caller's own row) — correct here, unlike Slice 2's membership lookup,
since Migration 3's RLS already scopes read access to "any member of a
household I belong to," and a roster page's entire purpose is to show
everyone. RLS remains the authority; this is a normal `select`, not a
`service_role` call.

Loading/empty/failure are distinct states (`loading`, `[]` with no
error, `[]` with `error` set) — a query failure never fabricates a
roster. Active, invited, and archived rows are all returned together;
each page decides what to do with which (see below).

## Member identity strategy

Every operation is keyed by `household_members.id` (a real, persisted
UUID) — display name is never used as identity anywhere in this slice.
Two members can share a display name; nothing in the roster, the
pickers, or the settlement engine relies on names being unique (see
"Duplicate-name result").

## Owner behavior

The current user's owner-ness comes from `useHousehold().currentMembership.role`
— the same row Migration 3's `create_household()` RPC already persisted
at household-creation time. It is never inferred as "the first member"
or "whoever is currently signed in" independent of that row. `isOwner`
gates the Members page's "Add member"/"Invite" buttons and the profile
drawer's archive/reactivate/remove controls — UI convenience only, since
RLS (`household_members_update_owner` et al.) is the actual authority; a
non-owner attempting the same write directly against the API would still
be correctly rejected server-side.

**Known gap, not fixed in this slice**: Migration 3's RLS checks who is
performing an update, not which row is targeted, so an owner could
technically archive their own owner-role row via a legitimate RLS-permitted
UPDATE, leaving the household with zero active owners (an unenforced
application-level invariant per Migration 1's own docs). Ownership
transfer is out of scope here, so the client-side fix is a hard rule:
the Members UI never offers archive/reactivate for a `role === 'owner'`
row, regardless of viewer. This is a UX safeguard, not a security
boundary — it does not change what RLS permits.

## Non-account member behavior

"Add member" inserts a `household_members` row with `profile_id = null`,
`role = 'member'`, `status = 'active'` — no `auth.users` row, no
`profiles` row, no email required. This is the intended shape for a
roommate who doesn't want or need their own login.

## Invited behavior

"Invite" inserts a row with `status = 'invited'`, `invited_email` set,
`profile_id = null`. No invitation email is sent, no `auth.users`
account is created, and there is no acceptance/profile-linking flow —
all explicitly out of scope. An invited row's own `invited_email` is the
only email ever shown for it; an active/joined member's real email lives
on `profiles`, which Migration 3's RLS does not let this client read for
anyone but the caller themselves (confirmed: even a PostgREST embed/join
is filtered per-row by RLS) — so every non-invited roster member's
`email` is `null` here, never fabricated.

## Archive behavior

"Remove" (the UI label stays) performs `UPDATE ... SET status =
'archived', archived_at = now()` — never a hard `DELETE` (there is no
DELETE grant on `household_members` at all, matching the `ON DELETE
RESTRICT` grocery FKs). An archived member's id, history, and any
grocery references to them stay intact and resolvable.

RLS-denied updates don't throw — they silently affect zero rows. Every
write in `useHouseholdMembers.ts` re-selects `id` with `.maybeSingle()`
afterward; `null` data with no error means "blocked by RLS," surfaced as
a permission error rather than a silent no-op.

## Reactivation behavior

`UPDATE ... SET status = 'active', archived_at = null`. The same stable
id survives active → archived → active, so nothing about a member's
identity (or any grocery/settlement reference to them) changes across
the cycle.

## Duplicate-name result

Two members with the same display name get different, independent
UUIDs. Both render as separate cards, both are independently selectable
in every picker, and archiving one never affects the other — nothing in
this slice resolves a member by name.

## Member selector changes

`useMemberOptions` excludes both `'invited'` and (newly) `'archived'`
members from `options` (new-selection pickers), while the full `members`
array — including archived/invited — still reaches the settlement
engine, so a grocery that already references an archived member stays
resolvable. `GroceryForm`, `MemberChipPicker`, and the Assistant's
`GeneratedGroceries` all consume `useMemberOptions()` already; none
needed direct changes beyond that one filter update.

## Local grocery compatibility

The highest-risk seam, per the original task brief. Groceries remain
local/session-state and still reference members **by name** (`paidBy`/
`sharedBy` strings, resolved to ids only at the settlement-engine
boundary via `src/adapters`) — that data model is unchanged and
correctly format-agnostic (`memberIdentity.ts`'s name resolution never
assumed mock data specifically).

What genuinely broke, and was fixed:

- **`src/store/groceries.ts`'s mock seed** (`paidBy: 'Aisha Khan'`, etc.)
  has no correspondence to any real household's actual roster, which for
  a fresh household starts as just its owner. `useGroceries()` now
  starts from `[]` instead — an initial-*value* change only, not a
  shape/behavior/persistence change.
- **`src/store/assistantGenerated.ts`'s mock "AI" output** had the same
  problem (`paidBy: 'Bilal Ahmed'`, etc. on some items). A mock
  integration has no way to know a real household's actual member names,
  so nothing is pre-filled now — every generated item needs review,
  consistent with the "never invent who paid or shared" principle the
  review step already exists to enforce.
- **`GroceryForm.tsx`'s default-payer lookup** matched `mockUser.name`,
  which no real signed-in user is ever named. Now resolved from
  `useHousehold().currentMembership.id` directly (same id space as
  `useMemberOptions`, since both come from `household_members`).
- **`toDomainMember`'s ternary** (`status === 'invited' ? invited :
  active`) would have silently mapped the new `'archived'` UI status to
  domain `'active'`. Rewritten as an exhaustive switch so an unmapped
  future status is a compile error, not a silent fall-through.

`src/hooks/useAnalytics.ts` and `src/services/settingsExportService.ts`
were reviewed and deliberately left untouched: both already read their
own fixed mock data (`src/store/members.ts`/`initialHistory`), entirely
independent of the live roster, both before and after this slice —
History/Analytics/Export are pre-existing, self-contained mock features
outside this slice's scope, not a regression it introduced.

## Settlement-engine compatibility

Unchanged math. The engine still receives whatever ids `toEngineInput`
resolves names to — real `household_members.id` UUIDs now, opaque
strings as far as the engine is concerned either way. Archived/invited
members are included in its balance output (for historical-reference
resolvability), which surfaced one adapter-layer bug: `MembersPage`'s
`withRealFinancials` unconditionally overwrote a member's `status` with
the computed financial status, which would have silently flipped an
archived/invited badge back to a financial one the moment they had any
balance. Fixed: `'archived'`/`'invited'` now only receive the
`amountPaid` overwrite, never `status`.

## User/household-switch safety

`useHouseholdMembers` resets its state **during render** (a ref
comparison against the current `household.id`, same pattern already
proven in `HouseholdProvider`), not via an effect — so a household
switch or sign-out can never render the previous household's roster,
even for one frame. Covered directly by unit tests (mount with household
A's roster loaded, switch to household B, assert the roster is empty
before B's own fetch resolves).

## Unit tests

- `src/members/useHouseholdMembers.test.tsx` (13 tests): load/empty/
  error states, `addMember`/`inviteMember` success and validation,
  `archiveMember`/`reactivateMember` success and RLS-denial detection,
  household-switch reset, no-household-loaded idle state.
- `src/hooks/useMembers.test.tsx` (10 tests): pass-through of
  loading/error/refresh, `handleAdd`/`handleInvite`/`handleRemove`/
  `handleReactivate` delegation and error propagation, local tone
  overrides, search filtering.
- `src/adapters/toEngineInput.test.ts` — added a case for the new
  `'archived'` → domain `'archived'` mapping (the exact bug the ternary
  → switch rewrite fixes).

## Playwright result

`npx playwright test --workers=1`: **67 passed, 25 skipped (mobile-skip
convention on desktop-only specs), 0 failed.**

Fixing this required more than wiring new specs — the fixture household
(`tests/e2e/global-setup.ts`) starts with exactly one real member (its
owner), and groceries are genuinely empty on every fresh page load now
(session-local, no seed). Several existing specs assumed both a
populated grocery list *and* a fixed four-person mock roster
(`Aisha Khan`/`Bilal Ahmed`/`Chloe Lee`/`Daniyal Raza`), neither of which
exists anymore:

- `enterApp()` no longer asserts a pre-populated list; it waits for
  whichever real outcome actually renders (empty state or populated).
- New shared helpers (`addGrocery`, `addMember`) drive the real
  add-grocery/add-member forms, since nothing seeds either automatically.
- `assistant-review.spec.ts`, `new-member-settlement.spec.ts`,
  `settlement-integration.spec.ts`, `grocery-delete-undo.spec.ts`,
  `nested-overlay-escape.spec.ts` were updated to add real members
  first, using **per-run unique, single-token names** (e.g. `` `Aisha${Date.now()}` ``)
  — the fixture household's roster persists and accumulates across
  every run, so a fixed name would eventually collide with a leftover
  row, and a single-token name keeps the "Paid by" dropdown (full name)
  and the sharing chips (first name only, per `MemberChipPicker`)
  reading the exact same string.
- `nested-overlay-escape.spec.ts` specifically had to stop opening "the
  first member's profile" — the first member is always the owner, and
  an owner's profile now deliberately has no archive/remove control at
  all (see "Owner behavior"). It adds a second, non-owner member first.

## Hosted verification

**Not yet performed.** This slice makes no schema/RLS/RPC change (no new
migration), so the same Migrations 1–4 already applied to
`grocerymate-dev` support it as-is — hosted verification here is a
frontend smoke check (point at the hosted project, confirm real member
add/invite/archive/reactivate against real RLS), not a schema
deployment. Given the pattern this engagement has followed throughout
(every hosted step run as its own explicitly-authorized task), this is
left for an explicit go-ahead rather than run automatically.

## Hosted data residue

None from this slice yet (see above). Slice 2's residue
(`docs/HOUSEHOLD_INTEGRATION.md`) is unchanged.

## Security review

- No `service_role` usage anywhere in `src/members/` or the code paths
  it touches — confirmed by source grep and by scanning the production
  bundle (`dist/assets/*.js`) for both the secret-key value and the
  `service_role` string; the only match was `@supabase/supabase-js`'s
  own internal key-prefix-classification logic, not an embedded secret.
  Only the local **publishable** key is embedded, as expected for a
  client bundle.
- No direct `auth.users`/`profiles` row is ever created for a
  non-account member — `addMember` only inserts into `household_members`
  with `profile_id: null`.
- No hard `DELETE` anywhere — archive/reactivate are both `UPDATE`s;
  there is no DELETE grant on the table to begin with.
- No display-name-as-identity — every read/write is keyed by the row's
  real `id`.
- No arbitrary `profile_id` is ever sent from the client on insert.
- The owner-self-archival RLS gap (see "Owner behavior") is called out
  explicitly rather than silently left; the mitigation is UI-level only
  and documented as such, not represented as a security fix.
- Typecheck/lint/build all clean; no secrets or key material appear in
  any new source file (`src/members/*`, `tests/e2e/helpers.ts`, etc.).

## Typecheck/lint/build

All clean. `npm run typecheck`: 0 errors. `npm run lint`: 0 errors, 6
pre-existing `react-refresh/only-export-components` warnings (unrelated
files, unchanged by this slice). `npm run build`: succeeds; the existing
"chunks larger than 500kB" advisory is pre-existing and unrelated.

## Regressions found and fixed

- `tests/e2e/helpers.ts`'s `enterApp()` assumed a pre-populated grocery
  list — became false the moment `useGroceries()` started empty.
- Five existing Playwright specs assumed the old fixed four-person mock
  roster and/or pre-seeded groceries — see "Playwright result" above.
- `MembersPage.tsx`'s `withRealFinancials` would have overwritten an
  archived/invited member's status badge with a computed financial one
  (see "Settlement-engine compatibility").
- `toDomainMember`'s ternary would have silently mismapped `'archived'`
  members to domain `'active'` (see "Local grocery compatibility").

## What remains local/mock

- Groceries: still session-local state (`src/hooks/useGroceries.ts`),
  starting empty rather than from a mock seed.
- Settlements: still computed client-side from local grocery state;
  never persisted.
- History/Analytics/Settings-export: unchanged, still their own
  fixed mock data (`src/store/history.ts`, `src/store/members.ts` via
  `useAnalytics`/`exportAllData`), independent of the real roster.
- Invitation email delivery, invite acceptance, profile linking,
  household switching, account deletion, ownership transfer — all
  explicitly out of scope for this slice, per the original task brief.

## Blockers before Slice 4

- The owner-self-archival RLS gap (see "Owner behavior") should be
  resolved at the database layer (e.g. a `CHECK`/trigger preventing a
  household's last active owner from being archived, or an ownership-
  transfer flow) before any slice that further empowers non-owner
  members or removes the current UI-only safeguard.
- Groceries/settlements still need their own persistence slice before
  `src/services/settingsExportService.ts` and `src/hooks/useAnalytics.ts`
  can be pointed at real data instead of their own fixed mock stores.
