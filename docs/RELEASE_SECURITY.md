# Release Security Hardening — Slice 6

Pre-deployment security/performance audit response for `grocerymate-dev`,
triggered by a direct Supabase advisor run against the hosted project. No
product features, no payments/billing, no application UX changes — this
slice is schema/config hardening plus verification, nothing else.

## Advisor findings (live, as of this audit)

Captured via `supabase db advisors --linked --type security|performance`.

**Security (4 findings):**

| #   | Finding                                              | Object                         | Disposition                                                 |
| --- | ---------------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| 1   | `anon_security_definer_function_executable`          | `public.rls_auto_enable()`     | **Fixed** — grants revoked                                  |
| 2   | `authenticated_security_definer_function_executable` | `public.rls_auto_enable()`     | **Fixed** — grants revoked                                  |
| 3   | `authenticated_security_definer_function_executable` | `public.create_household(...)` | **Accepted by design** — not changed                        |
| 4   | `function_search_path_mutable`                       | `public.set_updated_at()`      | **Fixed** — `search_path` pinned                            |
| 5   | `auth_leaked_password_protection`                    | Auth config                    | **Documented** — see below; requires a plan change, not SQL |

(Numbered 1–5 to match the advisor's own finding count; #1 and #2 are the
same function flagged for two different roles.)

**Performance (7 findings, all triaged):** 2 (`profiles` RLS initplan)
**fixed** in a small dedicated follow-up migration
(`20260916085502_profiles_rls_initplan_optimization.sql`); 5 (unindexed
FKs) reviewed and deferred, untouched. See "Performance advisories"
below.

## 1–2. `public.rls_auto_enable()` — origin, purpose, and fix

**Origin**: not GroceryMate's. It does not exist in any of our own
migrations, and a fresh `supabase db reset` (replaying only our
migrations against a clean local Postgres) produces no such function —
confirmed by direct inspection (`\df` returns 0 rows locally). It exists
only on the hosted project, provisioned by Supabase's own platform
tooling, independent of anything this codebase created.

**Purpose**: wired to a real event trigger, confirmed via
`pg_event_trigger`:

```
evtname: ensure_rls · evtevent: ddl_command_end · evtenabled: O · function: rls_auto_enable
```

The function body (captured via `pg_get_functiondef` against hosted)
loops over `pg_event_trigger_ddl_commands()` and runs
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on any newly created
`public`-schema table — Supabase's platform-level safety net against a
table accidentally being created without RLS (e.g. via the Dashboard's
Table Editor). It has no relationship to GroceryMate's own schema,
households, groceries, or members.

**Is it actually callable, despite the SECURITY DEFINER + broad grants?**
No — not meaningfully. Its return type is `event_trigger`, a pseudo-type
Postgres will only ever invoke through the event-trigger dispatch
mechanism. A direct call (e.g. `POST /rest/v1/rpc/rls_auto_enable`, the
exact path the advisor flagged as reachable by `anon`/`authenticated`)
reaches the function body, which immediately calls
`pg_event_trigger_ddl_commands()` — and that call raises an error when
invoked outside a live DDL event-trigger context. There is no exploitable
path through the grants the advisor found; GroceryMate's application code
never calls this function and has no reason to.

**Fix applied** (migration, guarded so it's a no-op where the function
doesn't exist):

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Per least privilege, revoked anyway — the event-trigger manager that is
this function's only real caller does not need ordinary EXECUTE privilege
the way an RPC caller would, so nothing legitimate is lost.

**Final privileges after the fix**: `anon` — no EXECUTE. `authenticated`
— no EXECUTE. Owner (`postgres`) — unaffected (owns and can always
execute its own function). Not dropped — it's Supabase's own object, not
ours to delete, and the `ensure_rls` event trigger still needs it to
exist and work exactly as before.

## `set_updated_at()` hardening

Already `SECURITY INVOKER` (the default — no `DEFINER` clause was ever
added in Migration 1, and none is needed: this trigger only ever needs
the calling statement's own privileges to write `NEW.updated_at`). Its
only advisor finding was a mutable `search_path`.

The body calls only `now()` (a `pg_catalog` built-in) and reads/writes
`NEW` (a trigger-context pseudo-variable, not schema-resolved) — nothing
in it needs `public` on the search path at all, so:

```sql
alter function public.set_updated_at() set search_path = pg_catalog;
```

is both safe and sufficient. `SECURITY INVOKER` was correct already and
was not changed to `DEFINER`. `ALTER FUNCTION ... SET` touches only the
function's configuration — not its body, OID, or any attached trigger —
so every existing trigger keeps firing unchanged.

**Tested** (local, after `supabase db reset` with the new migration
applied): inserted then updated a row on each of `profiles`, `households`,
`household_members`, and `grocery_items` as `postgres`, with a real delay
between insert and update (each statement autocommitted separately —
`now()` is fixed for the life of one transaction, so a single wrapping
transaction would have hidden the very thing being tested). `updated_at`
advanced correctly on all four tables. Test fixtures cleaned up
afterward; no residue.

## `create_household()` re-review — accepted by design, not modified

Re-confirmed against both the migration source and hosted's live
definition (`pg_get_functiondef` + `has_function_privilege`, read-only,
no changes made):

- `SECURITY DEFINER`: yes, intentional — required to atomically create a
  household and its first (owner) membership row without a chicken-and-
  egg RLS problem (no ordinary INSERT policy can authorize a household's
  very first membership row without also being loose enough to authorize
  _any_ household's membership rows).
- Owner derivation: `v_caller_id := auth.uid()` — read once, at the top
  of the function, from the JWT the caller actually authenticated with.
  None of the function's three parameters (`p_name`, `p_currency_code`,
  `p_display_name`) can supply an identity; there is no argument a caller
  could use to create a household "as" someone else.
- `search_path`: pinned to `''` (empty) since Migration 3 — every
  reference in the body is fully schema-qualified (`public.profiles`,
  `public.households`, `public.household_members`). Stronger than the
  `pg_catalog`-only pinning used for `set_updated_at()`, appropriate for
  a `SECURITY DEFINER` function.
- Grants: `revoke ... from public, anon` + `grant execute ... to authenticated`
  — confirmed identical on hosted via `has_function_privilege`:
  `anon_can_execute: false`, `authenticated_can_execute: true`.
- Atomicity: single PL/pgSQL function body — both inserts happen inside
  one function call, one implicit transaction; if either insert fails,
  neither commits.
- Cross-user creation: re-verified live (see "Adversarial regression"
  below) — a second real user cannot use this RPC to create a household
  "for" the first user; the owner is always the caller.

**Disposition**: the advisor warning is expected and accepted by design.
Not modified.

## Leaked password protection

**Current state**: disabled (per the advisor; also, GoTrue's public
`/auth/v1/settings` endpoint — checked read-only, no keys logged — does
not expose a client-facing toggle for this, confirming it's a
project/plan-level Auth config item, not something read or set through
ordinary API calls).

**Free plan support**: **not available on Free.** Per Supabase's own
docs (`supabase.com/docs/guides/auth/password-security`): _"Leaked
password protection is available on the Pro Plan and above."_ If
`grocerymate-dev` is currently on the Free plan, this cannot be turned on
without upgrading first — that's a billing/plan decision for the project
owner, not something this slice can or should change.

**Where to enable it** (once on Pro or above): Dashboard → Authentication
→ Sign In / Providers → **Email** provider settings (the toggle lives
alongside the Email provider's own password rules, not on a separate
"security" page). Cannot be set through SQL/migrations — it's Auth
service configuration, not a schema object, so nothing was added to the
migration for it.

**Compatibility impact**: enabling it adds a HaveIBeenPwned check at
sign-up and password-change time; Supabase's docs don't call out a
latency/availability caveat, but the practical effect is that a
previously-acceptable password already known to be compromised (e.g. from
an existing test account created before this was enabled) would still be
allowed to keep signing in — the check only runs at signup/password-change
time, not on every login — so existing sessions and passwords are
unaffected the moment it's turned on. New signups or password changes
using a leaked password would be rejected going forward.

## Performance advisories — triage (not fixed in this slice)

Per the task's own instruction: inspect and classify, don't blindly fix.
Confirmed identical on local (after `supabase db reset`) and hosted — these
are genuine schema-derived findings, not environment noise.

### `auth_rls_initplan` — `profiles_select_own` / `profiles_update_own` re-evaluate `auth.uid()` per row

**Classification: FIX BEFORE BETA — fixed**, in a small dedicated
follow-up migration (`20260916085502_profiles_rls_initplan_optimization.sql`),
deliberately kept separate from Migration 5's security-only hardening.

Both policies used bare `auth.uid()` in their `USING`/`WITH CHECK`
clauses:

```
-- before
profiles_select_own  USING (id = auth.uid())
profiles_update_own  USING (id = auth.uid())  WITH CHECK (id = auth.uid())
```

`auth.uid()` written directly inline gives Postgres's planner no reason
to treat it as safe to hoist out of the per-row check — it can end up
re-invoked once per candidate row scanned. Wrapping it as an
uncorrelated scalar subquery signals the opposite: a subquery that
doesn't reference the outer row is recognized as returning a constant
result for the query's duration, so the planner computes it once (an
"InitPlan") and reuses that cached value for every row instead of
recomputing it per row:

```
-- after
profiles_select_own  USING (id = (select auth.uid()))
profiles_update_own  USING (id = (select auth.uid()))  WITH CHECK (id = (select auth.uid()))
```

`auth.uid()` depends only on the caller's own JWT, never on the row
being checked, so the two forms are semantically identical —
**authorization behavior is unchanged**: same policies, same commands
(`SELECT`/`UPDATE`), same `to authenticated` role, same rows matched.
Applied via `ALTER POLICY` (not drop+recreate), so both policies kept
their existing identity; nothing else — grants, other tables' policies,
`create_household()`, `set_updated_at()`, the `private.*` helpers — was
touched. Verified locally: policy count unchanged at 14, no
duplicate/missing policy, targeted profiles authorization regression
(both users' SELECT/UPDATE isolation, anon denial, TRUNCATE denial,
column-grant checks) all pass, and both `auth_rls_initplan` advisory
findings are gone from the local advisor while the 5 unindexed-FK INFO
findings remain (untouched, as intended).

Every other table's policies (`households`, `household_members`,
`grocery_items`, `grocery_item_consumers`) already route through
`private.is_household_member()`/`private.is_household_owner()` helper
functions instead of a bare `auth.uid()` comparison, which is presumably
why only `profiles` was ever flagged — nothing needed changing there.

### `unindexed_foreign_keys` (5 findings, INFO level)

Investigated against actual query patterns in
`src/groceries/useHouseholdGroceries.ts`, not fixed blindly:

- **`grocery_item_consumers_grocery_item_id_fkey`** — **SAFE TO DEFER.**
  The table's composite PRIMARY KEY, `(grocery_item_id, household_member_id)`,
  already has `grocery_item_id` as its leading column — an effective
  covering index for every real lookup/cascade-delete path that filters
  by `grocery_item_id` alone (exactly what the app's edit/delete flows
  do: `.eq('grocery_item_id', id)`). The advisor likely flags this
  because no index matches the FK's _exact_ two-column tuple
  `(grocery_item_id, household_id)`, not because the real query pattern
  is actually unindexed.
- **`grocery_item_consumers_household_member_id_fkey`** — **SAFE TO
  DEFER.** Already has a dedicated single-column index,
  `grocery_item_consumers_household_member_id_idx`, added deliberately in
  Migration 2 for exactly this lookup (reconstructing a member's consumed
  total). Same "exact composite tuple" advisor nuance as above.
- **`grocery_items_paid_by_member_id_fkey`** — **SAFE TO DEFER.** Already
  has a dedicated index, `grocery_items_paid_by_member_id_idx`, added
  deliberately in Migration 2 ("a member's own 'total paid' is a real,
  frequent lookup").
- **`grocery_items_created_by_member_id_fkey`** — **SAFE TO DEFER,
  reconfirmed.** Migration 2 deliberately did not index this column,
  with an explicit comment: _"nothing in the current product queries
  'everything I logged' yet."_ Slice 5 added a real `itemsAdded` count
  keyed by `created_by_member_id` (`MembersPage.tsx`'s
  `withRealFinancials`) — checked specifically for this audit — but it
  filters the household's already-loaded, already-fetched grocery array
  client-side; it issues no new database query filtered by this column.
  The original reasoning still holds exactly.
- **`households_created_by_fkey`** — **SAFE TO DEFER.** No index at all
  today, and no query in the app filters households by `created_by`
  (ownership/access for RLS purposes always routes through
  `household_members.role`, never this column). `households` is also a
  low-cardinality table relative to `grocery_items`, so even a full
  table scan is cheap at any realistic scale for this app.

No new indexes were created. Per the task's own instruction, an index is
not free (write overhead, storage) and none of these have an actual
observed-slow query behind them yet.

## Adversarial regression (local, after the migration)

Full matrix run against local Postgres with real role/JWT simulation
(`SET ROLE` + `request.jwt.claims`, the same mechanism PostgREST itself
uses) — two real users, two real households, created through the actual
`create_household()` RPC, not raw inserts.

| Check                                                                          | Result                                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| anon: SELECT profiles/households/household_members/grocery_items               | PASS (permission denied on all four)                       |
| anon: INSERT households                                                        | PASS (permission denied)                                   |
| anon: EXECUTE `rls_auto_enable()`                                              | N/A locally (function doesn't exist here) — see note below |
| authenticated: sees own profile only                                           | PASS                                                       |
| authenticated: sees own household only                                         | PASS                                                       |
| authenticated: no cross-household `household_members` read                     | PASS                                                       |
| authenticated: no cross-household `households` read                            | PASS                                                       |
| authenticated: no cross-household `grocery_items` read                         | PASS                                                       |
| authenticated: cross-household UPDATE (`households`)                           | PASS (0 rows matched)                                      |
| authenticated: cross-household INSERT (`grocery_items` into another household) | PASS (RLS policy violation)                                |
| authenticated: impersonate creator (own household, claim another member's id)  | PASS (RLS policy violation)                                |
| authenticated: mutate `grocery_items.household_id`                             | PASS (column grant denied)                                 |
| authenticated: mutate `grocery_items.created_by_member_id`                     | PASS (column grant denied)                                 |
| authenticated: mutate `profiles.id`                                            | PASS (column grant denied)                                 |
| authenticated: mutate `household_members.id`                                   | PASS (column grant denied)                                 |
| authenticated: TRUNCATE `grocery_items` / `households`                         | PASS (permission denied on both)                           |
| authenticated: EXECUTE `rls_auto_enable()`                                     | N/A locally — see note below                               |
| `create_household()`: still works, still derives correct owner (both users)    | PASS                                                       |
| `updated_at`: advances on profiles/households/household_members/grocery_items  | PASS                                                       |
| Sanity — User1's legitimate own-item edit still succeeds                       | PASS                                                       |

**Note on `rls_auto_enable`**: since the function only exists on the
hosted project, the anon/authenticated-cannot-execute checks for it can't
be run locally. The grant revocation is correct by construction (a
`REVOKE EXECUTE` on a function that genuinely has those grants today,
confirmed via `has_function_privilege` against hosted before this
migration was written) and will be re-confirmed for real the moment this
migration is actually pushed to `grocerymate-dev` — not done in this
slice, per "do not apply remotely yet."

All fixtures created for this matrix (2 users, 2 households, 2 membership
rows, 1 grocery item) were deleted at the end of the same script run —
nothing left over locally.

## Known limitations carried forward (not introduced or fixed by this slice)

- **Household-creator account deletion**: a user who has ever created a
  household cannot have their Auth account deleted while that household
  still exists (`households.created_by ... on delete restrict`).
  Documented since Migration 4 / `docs/AUTH_INTEGRATION.md`; unrelated to
  this slice's changes.
- **Owner self-archive backend gap**: `household_members_update_owner`'s
  RLS check is based on _who_ is performing the update (the household's
  owner), not _which row_ is targeted — so an owner could technically
  archive their own owner-role row directly via the API, leaving the
  household with zero active owners. The Members UI never offers
  archive/reactivate for a `role === 'owner'` row, but that's a UX
  safeguard, not an RLS boundary. Documented since
  `docs/MEMBER_INTEGRATION.md` (Slice 3); still open. Fixing it requires
  either an application-level invariant (a trigger/check preventing a
  household's last active owner from being archived) or an ownership-
  transfer flow — both are real behavior changes, not something this
  security-hardening-only slice should introduce.

## Files changed

- `supabase/migrations/20260914192259_release_security_hardening.sql` —
  new migration: `rls_auto_enable` grants revoked (guarded), `set_updated_at`
  search_path pinned. No RLS policy, table, or grant on any application
  table was touched.
- `supabase/migrations/20260916085502_profiles_rls_initplan_optimization.sql` —
  new migration: `profiles_select_own`/`profiles_update_own` rewritten via
  `ALTER POLICY` to use `(select auth.uid())` instead of bare `auth.uid()`.
  No other policy, table, grant, or function touched.
- `docs/RELEASE_SECURITY.md` — this file.

No application code (`src/`) was changed in this slice.
