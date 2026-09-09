# Frontend Supabase Integration — Slice 2: Household Bootstrap + Context

Builds on `docs/AUTH_INTEGRATION.md` (Slice 1). Covers **only** the
current household's identity (name, currency, the caller's own
membership/role) and how a brand-new user gets one. Groceries, member
CRUD, and settlements are still the existing local/mock implementation.

## Architecture

```
<AuthProvider>                  src/auth/ (Slice 1, unchanged)
  <HouseholdProvider>           src/household/HouseholdProvider.tsx — new
    <BrowserRouter>
      <App>
        ...
        <ProtectedRoute>        src/auth/RouteGuards.tsx — unchanged
          <HouseholdGate>       src/household/HouseholdGate.tsx — new
            <AppRoutes>         only reached once a household is 'ready'
```

`HouseholdProvider` is the same deliberate exception to this codebase's
"hook + props" convention that `AuthProvider` already is (see
`AUTH_INTEGRATION.md`), for the same reason: needed in the route gate,
`Sidebar`, `TopBar`, and `SettingsPage`, none of which share a
parent-child relationship. It depends on `useAuth()` and is mounted
alongside it in `main.tsx`.

`HouseholdGate` is a **new, separate** component from `ProtectedRoute` —
auth and household are different concerns, and this keeps Slice 1's
already-verified auth routing completely untouched. It never navigates;
a non-`'ready'` status renders a full replacement screen in place, so
there's no redirect loop to avoid in the first place.

## Household query strategy

After the profile is available, `household_members` is queried filtered
by `.eq('profile_id', <the authenticated user's own id>)` — **never**
unfiltered (an unfiltered `select` would return the *entire roster* of
every household the caller belongs to, since Migration 3's RLS policy
grants read access to the whole roster, not just one's own row) and
**never** by an id sourced from routing or `localStorage`. This is what
proves Migration 3's RLS actually gates a real browser session, not just
direct database testing.

## Current-membership strategy (the multiple-membership decision)

The schema allows a profile to belong to multiple households; this MVP's
UI has no switcher. Classification, in order:

| Active rows | Archived rows | Result |
|---|---|---|
| 0 | 0 | `needs-setup` — onboarding shown |
| 1 | any | `ready` — that membership's household loads |
| 0 | 1 | `archived` — read-only screen, **not** onboarding |
| >1 | — | `unsupported` — explicit "not yet supported" screen |
| 0 or 1 | >1 | `unsupported` — same reasoning |

No row is ever picked arbitrarily. This is a deliberate, documented MVP
limitation — a real household switcher is future work, not something to
guess around here.

## Archived-membership behavior

An archived-only membership is **not** treated as "no household" — it
never triggers onboarding (which would otherwise let an archived member
accidentally spin up a second, unrelated household). It renders a
dedicated read-only screen instead, consistent with Migration 3's design
(archived members retain historical read, never write).

## Onboarding behavior

`HouseholdOnboardingPage` (reuses `AuthLayout` from Slice 1 — a generic
centered-card shell, not auth-specific despite its folder) asks for
exactly one field: household name. Currency is not asked for — MVP stays
on `create_household()`'s own `'BDT'` default. Display name is not asked
for either — omitted from the RPC call entirely, so the RPC's own
already-correct fallback to the caller's `profiles.display_name` is used,
rather than duplicating that logic client-side.

## RPC invocation

Household creation calls **only** `create_household({ p_name })` —
never a direct `insert` into `households` or `household_members`. No
`profile_id`, owner id, or role is ever sent; the RPC has no parameter
for any of them (verified in Migration 3/4's own remote verification),
so there is structurally nothing for the client to smuggle in.

## Double-submit protection

The submit button disables synchronously on click (`submitting` state,
set before the `await`), before the RPC call even starts — this is the
actual guard a rapid second click hits, not a debounce or a server-side
idempotency key. `create_household()` is **never** called automatically a
second time under any circumstance in this codebase (see below).

## Post-create refresh behavior

After a successful RPC call, `HouseholdProvider` re-queries
`household_members`/`households` through the normal `select` path — the
RPC's own return value (`household_id`, `owner_member_id`) is used only
to prove atomicity in testing, never persisted as client state directly.
If that follow-up query fails, the resulting state is `'error'` (a
distinct state from `'needs-setup'`), whose only recovery action is
`refresh()` — a re-query. There is no code path, anywhere, that calls
`createHousehold()` a second time automatically; the onboarding form is
also not re-shown once the RPC itself has succeeded, since `status` has
already moved on by then.

## mockHousehold replacement

`Sidebar`/`TopBar`'s `HouseholdSwitcher` now render the real household
(name, live member count). `HouseholdSwitcher`'s own prop type no longer
references `MockHousehold` at all — it was narrowed to the two fields it
actually uses (`name`, `memberCount`), decoupling it from both the mock
type and the full domain type.

**Deliberately left untouched**: `src/adapters/toEngineInput.ts` (uses
`mockHousehold.id` purely as a stable grouping key for the still-local
settlement engine — explicitly out of scope, "DO NOT change the
settlement engine") and `src/services/settingsExportService.ts` (labels
an export of still-entirely-mock groceries/members/history — swapping in
a real household name there while the exported contents stay fake would
be more confusing, not less; revisit once that data is real too).

## Sign-out / user-switch behavior

Household state resets **during render**, not via an effect, whenever
the authenticated identity changes at all — including switching directly
between two different signed-in users, not just signing out. An earlier
version only reset on sign-out and was caught by this slice's own unit
tests: switching from User A to User B without an intermediate sign-out
briefly kept showing User A's household. Fixed before shipping.

## Known limitations carried forward / introduced

- **No household switcher** — see the multiple-membership table above.
- **Archived-membership is read-only** with no in-app path back to an
  active household.
- **Account-deletion limitation (Migration 4, reconfirmed here)**:
  `households.created_by ... on delete restrict` means any account that
  has ever created a household can't be deleted while it exists. This
  slice's own hosted verification necessarily calls `create_household()`,
  so — unlike Slice 1 — its test accounts hit this limitation. They were
  archived (via the owner's own authenticated `UPDATE`, an already-approved
  operation) rather than deleted; see the manual verification log.

## What remains local/mock

Groceries, member CRUD (adding/removing/editing named members beyond the
owner), and settlements — entirely untouched, still `src/store/*` seed
data via `useMembers()`/`useGroceries()`.

## Next integration seam

Slice 3 is where member CRUD moves onto `household_members` for real
(invites, roles, archiving members) — at that point `useMembers()`'s
local state and the real roster this slice already queries for
`memberCount` need to be reconciled into one source of truth.

## Manual hosted verification log

Performed against `grocerymate-dev`, two temporary accounts (rate-limit
on hosted self-service signup meant the second used the Admin API to
create the user instead of the UI form — Slice 1 already verified the
self-service signup path itself, so this only substitutes the account
creation step, not anything under test). Verified: sign-up/sign-in → no
household → onboarding shown → household created → real name in shell →
Settings shows it → refresh persists it → ground truth confirmed via
direct query (exactly one household, exactly one active owner membership)
→ sign out → sign back in → same household loads, no duplicate created.

**Hosted test-data residue**: two households remain
(`ZZ-Slice2-Verify-Household-<timestamp>` ×2) with their owning accounts —
undeletable per the limitation above. Both were archived (`status =
'archived'`) via the owner's own authenticated update as the closest
available cleanup; not deleted, and the schema/FK was not altered to force
it.
