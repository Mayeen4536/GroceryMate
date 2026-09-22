# Slice 7 Design — Real Payment / Settlement Persistence

**Design only. Nothing in this document has been implemented, migrated,
or applied.** It supersedes §8 ("Payments / Mark Paid") of
`docs/SUPABASE_SCHEMA_DESIGN.md` — that section's table sketch is close
but predates the real engine/RLS; the differences and why are called out
below. It also supersedes `src/domain/Payment.ts`/`Settlement.ts`, which
model a _different_, unbuilt architecture (persisted "Settlement" debt
rows resolved 1:1 by a payment) that doesn't match how the real engine
works today (settlements are always recomputed fresh, never stored).

## STEP 1 — Current architecture audit

Traced end to end:

```
grocery_items (persisted)
  → useHouseholdGroceries() / useGroceries()              [real Supabase reads]
  → toEngineInput(members, groceries, currency, householdId)  [src/adapters/toEngineInput.ts]
  → calculateMemberBalances(members, groceries, currency)      [src/engine/calculateMemberBalances.ts]
       → { memberId, spentMinorUnits, consumedMinorUnits, netBalanceMinorUnits }
  → minimizeTransactions(memberBalances)                       [src/engine/minimizeTransactions.ts]
       → DebtTransfer[] { from, to, amountMinorUnits }
  → computeSettlement() bundles the above                      [src/engine/settlementEngine.ts]
  → useSettlementResult(members, groceries)                    [src/hooks/useSettlementResult.ts]
       → the ONE place a real settlement gets computed, memoized on (members, groceries)
  → toSettlementViewModel(result, members)                     [src/adapters/toSettlementViewModel.ts]
       → SettlementViewModel { summary, transfers, memberFinancials }
  → SettlementsPage.tsx renders viewModel.transfers as JourneyCards
  → useSettlements(transfers)                                  [src/hooks/useSettlements.ts]
       → markPaid(id) adds id to a React-state `dismissedIds` Set (session only)
       → appends a synthetic TimelineEvent to a React-state `timeline` array (session only)
  → Timeline.tsx renders `timeline` (or "No recorded payments yet." if empty)
```

**Where persistence stops:** at `useSettlements.markPaid`. Nothing after
that line touches Supabase. `dismissedIds`/`timeline` are plain
`useState`, reset on every page load, every household switch, and every
`members`/`groceries` change (the memo in `useSettlementResult` recomputes
`transfers` from scratch every time, so a dismissed transfer with the
exact same `from`/`to`/`amount` — that synthetic id is literally
`${from}::${to}::${amountMinorUnits}` — comes right back once
`dismissedIds` is cleared by a refresh).

Nothing else in the chain needs to change shape to add real persistence:
`calculateMemberBalances` and `minimizeTransactions` are pure, take plain
arrays, and don't know or care where those arrays came from — exactly the
property `docs/SUPABASE_SCHEMA_DESIGN.md` §7 already banked on
("`src/engine/*` — takes plain arrays, doesn't know or care where they
came from"). This holds up in practice: it's also exactly why Slice 4/5
never had to touch the engine at all.

## STEP 2 — What "Mark as paid" must mean

**A payment is an immutable, independent ledger event — never a mutation
of a suggested transfer.** The engine's `DebtTransfer[]` is a _suggestion_
recomputed fresh every time (already true today — see the `toSettlementViewModel.ts`
comment explaining why a transfer's id includes its amount: "if the same
two people's balance changes to a genuinely different amount, this must
read as a new, undismissed transfer"). Persisting "transfer #3 got paid"
would freeze a snapshot of a value that was never meant to be stable.

Instead: record the real event (`A → B, ৳200`), and recompute _everyone's_
net position — grocery obligations adjusted by every recorded payment —
then re-run the same minimization to get a fresh suggestion. A →
B ৳500 owed, A pays B ৳200, doesn't "resolve transfer #3"; it changes A's
net balance from -500 to -300 and B's from +500 to +300, and the _next_
computed suggestion (still A → B, now ৳300) reflects that a new payment
would need to be ৳300, not the original ৳500 minus something tracked
per-transfer.

This is also the only design that survives a 3+-member household. Once
there are 3+ non-zero balances, `minimizeTransactions`'s pairing (who is
suggested to pay whom) can shift when _any_ member's balance changes, even
if a specific pair's own balances didn't move relative to each other. A
payment recorded against "the current suggested transfer" would silently
break the moment the suggested pairing changes shape. A payment recorded
against _balances_ (a stable, well-defined per-member quantity) has no
such fragility — see STEP 4 for why this also makes the older
schema-design doc's transfer-level reconciliation formula (§8) not quite
right for households above 2 members.

## STEP 3 — Payment domain model

```
id                     uuid            required — server-generated identity
household_id           uuid            required — which household this belongs to
from_member_id         uuid            required — who paid
to_member_id           uuid            required — who received it
amount_minor           integer         required — the amount, in minor units, matching every other money column
created_by_member_id   uuid            required — who actually recorded this row (anti-impersonation anchor)
created_at             timestamptz     required — server-generated, immutable

-- optional, justified below
note                   text            optional — free-text context
reversal_of_payment_id uuid            optional — self-FK, only present on a correction row
```

| Column                   | Why it exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Required? | Who controls it                                                                                                                                                                                                                                                                                                                                                                 | Mutable?                        | FK / delete behavior                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | Stable row identity, referenced by `reversal_of_payment_id` and used as the timeline's React key.                                                                                                                                                                                                                                                                                                                                                                               | Required  | Server (`gen_random_uuid()`)                                                                                                                                                                                                                                                                                                                                                    | No — never changes after insert | PK                                                                                                                                                                                              |
| `household_id`           | Scopes the row for RLS and for the "load this household's payments" query, same role as on every other table.                                                                                                                                                                                                                                                                                                                                                                   | Required  | Server, derived — never trusted from client input; see STEP 6                                                                                                                                                                                                                                                                                                                   | No                              | FK → `households(id)` **ON DELETE CASCADE** (matches `grocery_items`; households are never hard-deleted by app code, this is defense-in-depth only)                                             |
| `from_member_id`         | Who paid — the real financial fact.                                                                                                                                                                                                                                                                                                                                                                                                                                             | Required  | Client-supplied, but constrained (see STEP 6/7)                                                                                                                                                                                                                                                                                                                                 | No                              | Composite FK → `household_members(id, household_id)`, default NO ACTION (a member row can never be hard-deleted while referenced, same guarantee `grocery_items.paid_by_member_id` already has) |
| `to_member_id`           | Who received it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Required  | Client-supplied, constrained                                                                                                                                                                                                                                                                                                                                                    | No                              | Same composite FK pattern as `from_member_id`                                                                                                                                                   |
| `amount_minor`           | The amount. Integer minor units, no currency column — inherits `households.currency_code`, identical reasoning to `grocery_items.amount_minor`.                                                                                                                                                                                                                                                                                                                                 | Required  | Client-supplied                                                                                                                                                                                                                                                                                                                                                                 | No                              | CHECK `> 0`                                                                                                                                                                                     |
| `created_by_member_id`   | Anti-impersonation anchor: the real, server-verified household-member identity of whoever actually submitted this row — **never** trusted from client input; always derived server-side from `auth.uid()` via the same `private.household_member_id_for(household_id)` helper `grocery_items_insert_active_member` already uses. Named to match `grocery_items.created_by_member_id` exactly, not the older schema-design doc's `recorded_by_profile_id` — see rationale below. | Required  | Server-verified via RLS `WITH CHECK`, never the raw client value                                                                                                                                                                                                                                                                                                                | No                              | Composite FK → `household_members(id, household_id)`                                                                                                                                            |
| `created_at`             | When it was recorded; drives the timeline's chronological order.                                                                                                                                                                                                                                                                                                                                                                                                                | Required  | Server (`default now()`)                                                                                                                                                                                                                                                                                                                                                        | No                              | —                                                                                                                                                                                               |
| `note`                   | Free-text context ("cash, handed over Tuesday"). Genuinely useful for a financial record a household might need to explain later, and every comparable free-text field elsewhere (`grocery_items.notes`) already exists for the same reason.                                                                                                                                                                                                                                    | Optional  | Client-supplied                                                                                                                                                                                                                                                                                                                                                                 | No                              | —                                                                                                                                                                                               |
| `reversal_of_payment_id` | Points at the original payment a correction is reversing — see STEP 5. Nullable: only reversal rows use it.                                                                                                                                                                                                                                                                                                                                                                     | Optional  | Client-supplied, but only meaningful in combination with amount/parties being the exact inverse — validated at the application layer, not a DB constraint (a DB CHECK can't easily express "this row's amount/direction is the arithmetic inverse of another row" without a trigger, and a trigger here would be solving a problem the UI already fully controls at write time) | No                              | Self-FK → `payments(id)`, default NO ACTION                                                                                                                                                     |

**Rejected fields:**

- **`status`** — not needed. A payment either exists or it doesn't (STEP 5); there is no "pending" state for a `Mark as paid` action a user just performed themselves in real time. `docs/SUPABASE_SCHEMA_DESIGN.md` §8 already reached the same conclusion.
- **`currency`/`currency_code`** — not needed, same reasoning as every other money column in this schema: one currency per household, already on `households.currency_code`.
- **`updated_at`** — not needed. Payments are never updated (STEP 5); a trigger/column that can never fire is dead weight, the same reasoning `grocery_item_consumers` (a pure insert/delete relation, no `updated_at`) already established.
- **`client_dedupe_key`** — evaluated in STEP 11, recommended as a _real_ column, listed separately there rather than folded in here since it's an idempotency mechanism, not a financial fact about the payment itself.

**Deviation from `docs/SUPABASE_SCHEMA_DESIGN.md` §8:** that section proposed `recorded_by_profile_id uuid null references profiles(id)`. This slice's design uses `created_by_member_id uuid not null references household_members` instead, for two reasons: (1) it matches the established, working `grocery_items.created_by_member_id` pattern exactly — same column name, same composite-FK shape, same derivation via `private.household_member_id_for()` — rather than introducing a second, inconsistent "who did this" pattern; (2) the caller of any authenticated write already necessarily has an active `household_members` row (RLS requires it), so a `household_members` reference is sufficient on its own and doesn't need a separate `profiles` lookup to answer "was this the same real person as an active member" — `household_members` already answers that.

## STEP 4 — Financial semantics and engine integration

**The math:**

```
adjustedNet(member) = groceryNet(member) + Σ(payments TO member) − Σ(payments FROM member)
```

Worked example (matches the task's own):

```
Groceries only:  A = -500,  B = +500
Payment A→B 200: A = -500 + 200 = -300,  B = +500 - 200 = +300
```

The sum of all `adjustedNet` values is always exactly zero, for any set
of payments — each payment moves `+amount` to one member and `-amount`
to another, so the total is unaffected. This means `minimizeTransactions`'s
existing zero-sum invariant check (`UnbalancedInputError` if the total
isn't zero) is satisfied automatically; nothing about that function needs
to change.

**Overpayment falls out for free, with no special-casing.** If A actually
owed B ৳500 and pays ৳700: `adjustedNet(A) = -500 + 700 = +200`. A is now
correctly shown as _owed_ ৳200 by the household — which is financially
correct (A put in more than their fair share) — and the next settlement
computation will suggest someone pays A back. `docs/SUPABASE_SCHEMA_DESIGN.md`
§8's transfer-level formula ("clamped so it never goes negative... without
a deliberate product decision about what that should mean") explicitly
punted on this; the balance-level design resolves it with no clamping and
no special case, because it operates on the same real quantity
(`spentMinorUnits − consumedMinorUnits ± payments`) the engine already
treats as signed and unbounded.

**Integration point — extend the engine, not the UI layer:**

```ts
// src/engine/types.ts — new, minimal
export interface PaymentEvent {
  readonly from: MemberId
  readonly to: MemberId
  readonly amountMinorUnits: number
}

// src/engine/applyPayments.ts — new, small, pure
export function applyPayments(
  balances: readonly MemberSettlementSummary[],
  payments: readonly PaymentEvent[],
): readonly MemberSettlementSummary[]

// src/engine/settlementEngine.ts — extended, not rewritten
export function computeSettlement(
  members: readonly Member[],
  groceries: readonly GroceryItem[],
  currency: Currency,
  payments: readonly PaymentEvent[] = [], // new, optional, backward-compatible
): SettlementResult {
  const groceryBalances = calculateMemberBalances(members, groceries, currency)
  const memberBalances = applyPayments(groceryBalances, payments)
  const transfers = minimizeTransactions(memberBalances)
  return { currency, memberBalances, transfers }
}
```

`applyPayments` only ever touches `netBalanceMinorUnits`. It **must not**
touch `spentMinorUnits`/`consumedMinorUnits` — those two fields are
"what this member spent/consumed on real groceries," and payments are not
grocery spending (see STEP 9 for exactly which screens read which field).
Every existing caller of `computeSettlement` keeps working unmodified
(the new parameter defaults to `[]`, an explicit "no payments yet" case
that produces byte-identical output to today). `calculateMemberBalances`
and `minimizeTransactions` are untouched — both already have extensive
test suites (`calculateMemberBalances.test.ts`, `minimizeTransactions.test.ts`,
`settlementEngine.property.test.ts`) that keep validating exactly what
they validate today; only `applyPayments` and the small extension to
`computeSettlement`'s own test need new coverage.

`toEngineInput.ts` gains a small sibling (or an added responsibility) to
turn persisted `payments` rows into `PaymentEvent[]` — the same "translate
DB-shaped rows into engine-shaped input, once, in one place" role it
already plays for members/groceries.

**Explicitly not done in the UI layer:** no component computes "remaining
after payments" itself. `useSettlementResult` passes `payments` through to
`computeSettlement` exactly as it already passes `members`/`groceries`; the
resulting `viewModel.transfers`/`summary`/`memberFinancials` are already
correct by the time they reach any component.

## STEP 5 — Corrections: immutable + reversal (Option B)

**Payments are immutable. No UPDATE, no DELETE, ever** — enforced by
simply never granting those privileges to `authenticated` at all (the
same pattern already used for `household_members`, which has no DELETE
grant for the identical "financially/historically meaningful data doesn't
silently disappear" reason). A correction is a new row.

**MVP UX for the three named scenarios**, all handled the same way — "record
a correcting payment," never an edit or delete:

- **Accidental payment** (recorded one that didn't happen): insert a
  reversal row — same `household_id`, `from_member_id`/`to_member_id`
  **swapped** relative to the original, same `amount_minor`,
  `reversal_of_payment_id` pointing at the mistaken row, a default note
  ("Reversal of accidental entry"). Net effect: the original's balance
  impact is exactly canceled (A→B 200 followed by B→A 200 nets to zero
  for both).
- **Wrong amount**: reversal of the original (as above) + a fresh, correct
  payment row. Two real events in the ledger, not one edited one — matches
  "replaying every row in order gives the true history."
- **Wrong recipient**: same as wrong amount — reversal + a fresh correct
  payment to the right person.

This is not exposed as three different UI flows. One UX pattern —
"Undo this payment" on any payment in the timeline, which inserts the
reversal row — covers all three; "wrong amount"/"wrong recipient" are just
"undo, then record it again correctly," using the exact same "Mark as
paid" flow a second time. Nothing more elaborate is needed for MVP; a
full accounting/adjustment UI (partial reversals, multi-way corrections)
is explicitly out of scope.

## STEP 6 — Authorization model

Mirrors the existing `grocery_items_insert_active_member` trust model
exactly, for consistency with how this app already treats "logging
something on the household's behalf":

- **Who may record a payment?** Any **active** member of the household
  (via the caller's own JWT → `private.household_member_id_for(household_id)`
  resolving to a real, active membership row). Same authorization axis
  `grocery_items`/`household_members` already use.
- **Payment FROM themselves?** Yes.
- **Payment FROM another member (to themselves or a third member)?**
  Yes — same reasoning as groceries: `grocery_items_insert_active_member`
  never restricts `paid_by_member_id` to the caller, only
  `created_by_member_id`. Recording "Alice paid Bob ৳500" as a witnessing
  third member (e.g., the person who was there when cash changed hands)
  is a normal, expected household pattern here, not an edge case to lock
  down.
- **Payment TO themselves?** Yes (trivially — "someone paid me").
- **Payment between two other members, caller party to neither?** Yes,
  for the same consistency reason. **Recommended, with a noted
  alternative:** if the product wants payments treated as more
  "authoritative" than a grocery log line (since a payment directly
  zeroes out a suggested debt), this could instead be owner-only or
  restricted to a party of the transaction — flagged as an open question
  in the final report, not decided here.
- **What may an owner do that a regular member can't?** Nothing extra is
  needed. Since any active member can already record any payment between
  any two members (per the point above), and corrections are just
  another payment row under the same rule, there's no owner-only action
  left to grant. (Contrast with `household_members_update_owner`, where
  owner-only genuinely matters — payments don't have an analogous
  "administrative" action.)
- **Can archived members create payments?** No. Same rule as groceries:
  `is_household_member(household_id, false)` (active-only) gates
  `created_by_member_id`'s derivation — an archived member has no active
  membership row to resolve, so any insert attempt fails the same way an
  archived member's grocery-insert attempt already fails today.
- **Can `from_member_id`/`to_member_id` reference an archived member?**
  Yes — a household needs to be able to record "Dana (who has since left)
  finally paid back what she owed," same as `grocery_items.paid_by_member_id`
  already allows referencing an archived member. Only the _caller_
  (`created_by_member_id`) must be active; the parties to the payment
  itself may be archived.
- **Who may read historical payments?** Any member, active or archived —
  `private.is_household_member(household_id, true)` (include-archived),
  identical to `grocery_items_select_member`/`households_select_member`.
  An archived member should still be able to see their own settled-up
  history, consistent with "archived members preserve historical
  references."
- **Can payments be updated?** No — no UPDATE grant to `authenticated` at
  all (STEP 5).
- **Can payments be deleted?** No — no DELETE grant to `authenticated` at
  all (STEP 5).

**Anti-impersonation, consistent with the existing model:**
`created_by_member_id` is never trusted from client input. The INSERT
policy's `WITH CHECK` requires
`created_by_member_id = private.household_member_id_for(household_id)` —
exactly the same clause `grocery_items_insert_active_member` already
uses to make `grocery_items.created_by_member_id` untrustable-by-forgery.
A client that sends a different `created_by_member_id` in its request
body gets rejected outright, the same way a forged grocery creator id
already is today.

## STEP 7 — Cross-household protection

Composite FKs, exactly like every existing cross-household guarantee in
this schema:

```
foreign key (from_member_id, household_id) references household_members (id, household_id)
foreign key (to_member_id, household_id)   references household_members (id, household_id)
foreign key (created_by_member_id, household_id) references household_members (id, household_id)
```

Each composite FK forces the referenced member to genuinely belong to
_this_ row's own `household_id` — not just to belong to _some_ household
that happens to have a member with that id (the exact class of attack
`grocery_item_consumers`'s own composite FKs already close, per Migration
2's design notes). A caller cannot construct a payment naming a Household
B member while writing `household_id = <Household A>`; the FK rejects the
insert outright, independent of RLS.

Two further CHECK constraints:

```
check (from_member_id <> to_member_id)   -- no self-payment
check (amount_minor > 0)                  -- no zero or negative payment
```

Both match the task's requirement exactly and mirror constraints already
present elsewhere (`grocery_items.amount_minor > 0`,
`minimizeTransactions`'s own structural guarantee that a transfer's `from`
and `to` are never the same member).

## STEP 8 — Account/member lifecycle

| Scenario                                                                                                                           | Behavior                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payer (`from_member_id`) becomes archived, after the payment exists                                                                | Row is untouched — no ON DELETE/trigger fires on archive (archiving only changes `household_members.status`, never removes the row). The payment stays fully attributed and readable, its financial effect on balances unchanged.                                                                                                                                     |
| Recipient (`to_member_id`) becomes archived                                                                                        | Same — untouched, still attributed, still counted.                                                                                                                                                                                                                                                                                                                    |
| Auth account (`auth.users`/`profiles`) is deleted but the `household_members` row remains (a non-account/no-longer-account member) | No effect on the payment — `from_member_id`/`to_member_id`/`created_by_member_id` all reference `household_members(id)`, never `profiles(id)` directly, so a payment never depends on the payer's/recorder's Auth account still existing. This is _why_ `created_by_member_id` (not `recorded_by_profile_id`) is the right column — see STEP 3's deviation rationale. |
| Display name changes                                                                                                               | No effect — the payment stores ids, never a name; display always resolves the current `household_members.display_name` at render time, identical to every other id→name resolution in this app (`buildMemberNameResolver`, Slice 5).                                                                                                                                  |
| Household becomes archived                                                                                                         | Existing payments remain readable (archived households aren't deleted, matching the existing `households.status` lifecycle); whether _new_ payments can still be recorded against an archived household should follow whatever rule already governs archived-household writes for groceries — not something new to invent here.                                       |

**Net effect:** a historical payment is always fully interpretable, by
design, for the same reason `grocery_items` already is — every reference
is a stable id, composite-FK-protected, and archival is soft (status
flip, not deletion) everywhere in this schema.

## STEP 9 — Settlement recalculation: which screens change

| Screen / value                                                                      | Incorporates payments?                       | Why                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settlements page: `transfers` (JourneyCards)                                        | **Yes**                                      | Directly the output of the extended `computeSettlement`                                                                                                          |
| Settlements page: `summary.outstanding`/receivers/owers                             | **Yes**                                      | Derived from the same `memberBalances`                                                                                                                           |
| Settlements page: "Everyone's square" (`allSettled`)                                | **Yes, automatically**                       | Already `transfers.length === 0`, unchanged code — becomes correct for free once `transfers` reflects payments                                                   |
| Members page: `status` (owed/owes/settled badge)                                    | **Yes**                                      | Derived from `netBalanceMinorUnits`, which now includes payments                                                                                                 |
| Members page: `amountPaid` ("Total paid")                                           | **No**                                       | Maps from `spentMinorUnits` — grocery spending only, untouched by `applyPayments`                                                                                |
| History page                                                                        | **No**                                       | Stays exactly `grocery_items`-derived (Slice 5); a payment is not a grocery and must never appear as one                                                         |
| Analytics (total spend, category totals, payer contribution, personal/shared split) | **No**                                       | All derived from `spentMinorUnits`/`consumedMinorUnits`/raw grocery amounts — a payment is debt settlement, not spending, and must never inflate any spend total |
| Settlements payment timeline                                                        | **Yes — this is the whole point of Slice 7** | Real `payments` rows replace the "No recorded payments yet." empty state (STEP 10)                                                                               |

The one-line rule for implementation: **`applyPayments` only ever writes
`netBalanceMinorUnits`.** Every screen's correct/incorrect behavior above
falls directly out of that single constraint — no per-screen special
casing is needed anywhere else.

## STEP 10 — Timeline

Replace `useSettlements`'s session-local `timeline` state entirely with a
pure derivation over real, persisted `payments` — same shape and spirit as
Slice 5's `buildHistoryEntries`:

```ts
function buildPaymentTimeline(payments: readonly Payment[], members: readonly Member[]): TimelineEvent[] {
  const nameOf = buildMemberNameResolver(members) // reused as-is from Slice 5
  return payments
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // newest first, matching every other real feed
    .map((p) => ({
      id: p.id,
      kind: 'payment',
      title: `${firstName(nameOf(p.fromMemberId))} paid ${firstName(nameOf(p.toMemberId))} ${formatTaka(minorToMajor(p.amountMinor))}`,
      when: fullDateLabel(p.createdAt), // reused as-is from src/utils/date.ts (Slice 5)
    }))
}
```

No fabricated entries; an empty `payments` array still renders
`Timeline.tsx`'s existing honest "No recorded payments yet." exactly as
today. A reversal row appears as its own real timeline entry (in its own
right, "B paid A ৳200" reads correctly on its own merits) — no special
"reversed" styling is required for MVP, though a future refinement could
visually pair a reversal with what it reverses via `reversal_of_payment_id`.

## STEP 11 — Idempotency / double-submit protection

Real risk, worth a small, real mitigation — **not** worth a general
distributed-idempotency framework.

- **Client-side (necessary but not sufficient on its own):** disable the
  "Mark as paid" button immediately on first press, matching the existing
  `SettleButton` component's animate-then-lock pattern; a genuine
  in-flight guard so a second physical click can't fire a second request
  while the first is still pending.
- **Server-side (the real protection — a network retry or a slow
  double-tap that beats the disable can still reach the server twice):**
  add one nullable column, `client_dedupe_key uuid`, generated **once**
  by the client at the moment the user presses "confirm" (`crypto.randomUUID()`),
  sent with the insert, and a partial unique index:

  ```
  create unique index payments_household_dedupe_key_idx
    on payments (household_id, client_dedupe_key)
    where client_dedupe_key is not null;
  ```

  A genuine retry of the _same_ logical submission reuses the _same_
  key (the client only generates a new one when the user starts a new,
  separate "mark as paid" action), so Postgres itself rejects the second
  insert with a unique-violation the client can recognize and treat as
  "already recorded, not an error" — no read-then-write race, no
  extra round trip for the common case. This is the smallest mechanism
  that actually closes the "financial duplicate" risk the task flags as
  high-impact; a session-only or React-state-only guard does not (a page
  reload or a second tab defeats it entirely).

## STEP 12 — Proposed `payments` table (conceptual — not to be applied)

```sql
create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  household_id            uuid not null,
  from_member_id          uuid not null,
  to_member_id            uuid not null,
  amount_minor            integer not null check (amount_minor > 0),
  created_by_member_id    uuid not null,
  note                    text,
  reversal_of_payment_id  uuid,
  client_dedupe_key       uuid,
  created_at              timestamptz not null default now(),

  check (from_member_id <> to_member_id),

  constraint payments_household_id_fkey
    foreign key (household_id) references public.households (id) on delete cascade,
  constraint payments_from_member_id_fkey
    foreign key (from_member_id, household_id) references public.household_members (id, household_id),
  constraint payments_to_member_id_fkey
    foreign key (to_member_id, household_id) references public.household_members (id, household_id),
  constraint payments_created_by_member_id_fkey
    foreign key (created_by_member_id, household_id) references public.household_members (id, household_id),
  constraint payments_reversal_of_payment_id_fkey
    foreign key (reversal_of_payment_id) references public.payments (id)
);

-- Query pattern: "this household's payments, newest first" — same shape
-- as grocery_items_household_id_created_at_idx (Migration 2).
create index payments_household_id_created_at_idx
  on public.payments (household_id, created_at desc);

-- Idempotency (STEP 11) — partial, since most rows never set this.
create unique index payments_household_dedupe_key_idx
  on public.payments (household_id, client_dedupe_key)
  where client_dedupe_key is not null;

alter table public.payments enable row level security;

-- Grants: no UPDATE, no DELETE, ever — true immutability at the grant
-- level, the same pattern household_members already uses for DELETE.
revoke all on public.payments from authenticated, anon;
grant select on public.payments to authenticated;
grant insert (household_id, from_member_id, to_member_id, amount_minor, created_by_member_id, note, reversal_of_payment_id, client_dedupe_key)
  on public.payments to authenticated;

create policy payments_select_member
  on public.payments for select
  to authenticated
  using (private.is_household_member(household_id, true));

create policy payments_insert_active_member
  on public.payments for insert
  to authenticated
  with check (
    private.is_household_member(household_id, false)
    and created_by_member_id = private.household_member_id_for(household_id)
  );

-- No UPDATE policy, no DELETE policy — moot given no grant exists for
-- either, but the absence of both is itself part of the design record.
```

**`updated_at` decision: omitted entirely.** No trigger, no column — a
row that can never be updated has nothing for `updated_at` to track,
identical reasoning to `grocery_item_consumers`.

No new tables beyond this one. No changes to `households`,
`household_members`, `grocery_items`, or `grocery_item_consumers`.

## STEP 13 — Migration strategy

**Recommended: Migration 7A (schema/RLS) → Frontend Slice 7B
(integration), same split this project has used for every real feature
so far** (grocery persistence was its own migration before the frontend
slice consumed it; members before that). Concretely:

1. **Migration 7A** — the `payments` table exactly as in STEP 12: table,
   constraints, indexes, RLS enabled, grants, both policies. Nothing else.
   Locally tested (reset + adversarial RLS matrix) before ever touching
   hosted, matching the exact process Slices 4/6/6.1 already established.
2. **Frontend Slice 7B** — `src/engine/applyPayments.ts` +
   `computeSettlement`'s extended signature, a `usePayments`/
   `useHouseholdPayments` hook (same shape as `useHouseholdGroceries`),
   `useSettlements` rewritten to read real payments instead of session
   state, `Timeline.tsx`'s feed wired to `buildPaymentTimeline`, the
   "Mark as paid" UX updated to support entering an amount (not just
   confirming the full suggested transfer) plus the reversal/"Undo" UX
   from STEP 5, and the `client_dedupe_key` generation on the client.

This keeps each step small and independently revertable: 7A alone changes
nothing a real user can see (the table exists but nothing writes to or
reads from it yet, matching how Migration 2's `grocery_items` table also
predated `useGroceries` actually using it by one slice's worth of review).
7B is then a pure frontend/engine slice against an already-verified
schema, exactly the pattern that made Slices 4 and 5 straightforward.

## STEP 14 — Test strategy

**Engine-level (`applyPayments`/`computeSettlement`), pure unit tests —
no I/O:**

- A owes B ৳500 → payment A→B ৳200 → remaining A=-300, B=+300, suggested
  transfer A→B ৳300.
- Full payment (A→B ৳500) → both members net zero, zero suggested
  transfers, `allSettled` true.
- Overpayment (A→B ৳700 against a ৳500 debt) → A flips to net +200 (owed
  by the household), B net -200 (now owes A back).
- Multiple payments between the same pair, summed correctly.
- Payments in opposite directions between the same pair (A→B 200 and
  B→A 50) — net exactly as if a single A→B 150 payment had occurred.
- Three-member settlement with a payment between a pair the engine's own
  minimized-transfer suggestion did _not_ originally include — proves the
  balance-level design (STEP 4) handles a payment between any two
  members, not just ones already "suggested" to pay each other.
- One-paisa payment (`amount_minor = 1`) — no rounding drift, matching the
  existing money-precision test conventions already used elsewhere
  (`money-display.spec.ts`).
- Large amount — no integer overflow within JS's safe integer range at
  realistic household scales.
- Reversal: original + its exact-inverse reversal nets to zero for both
  parties, and the reversal itself is a real, independent row (both
  visible in a payments list).

**RLS/adversarial (SQL, same `SET ROLE` + `request.jwt.claims` technique
already established in Slices 6/6.1):**

- Duplicate submission with the same `client_dedupe_key` — second insert
  rejected by the unique index, first insert unaffected.
- Cross-household attempt — a payment naming a real member of a
  _different_ household is rejected by the composite FK, independent of
  RLS.
- Member impersonation — an insert with `created_by_member_id` set to
  someone other than the caller's own resolved membership id is rejected
  by the `WITH CHECK` clause, the same way a forged grocery creator id
  already is.
- Archived member behavior — an archived caller cannot insert a payment
  at all; a payment naming an archived member as `from`/`to` (recorded by
  a still-active member) succeeds and remains readable.
- Anon: no SELECT, no INSERT.
- No UPDATE/DELETE possible for any role, including the original creator.

**App-level (Playwright, matching the existing `--workers=1` fixture-safe
conventions from Slices 4/5):**

- Refresh persistence — mark a real payment, reload, the transfer stays
  resolved (this is the literal bug Slice 7 fixes; the single most
  important end-to-end check).
- Payment timeline truthfulness — appears only after a real payment
  exists, never fabricated, survives refresh, disappears from "recorded
  payments" only via a real reversal (never edited away).
- Account deletion preserving payment history — a payment recorded by a
  member whose Auth account is later removed (per the existing
  known-limitation pattern) remains fully attributed and readable, since
  it was always anchored to `household_members`, never `profiles`,
  directly.

## STEP 15 — Release/business relevance

This closes the single biggest remaining credibility gap in GroceryMate
as a real product: today, the app can correctly _calculate_ who owes
whom, but has no memory that a debt was ever actually resolved — every
session, refresh, or day later, a paid-off debt reappears exactly as it
was, which is precisely the kind of thing that makes a bill-splitting
tool feel untrustworthy to real users (the core value proposition of an
app like this _is_ "remember what's settled"). Real payment persistence
is what turns GroceryMate from "a calculator" into "a ledger" — the
actual product category it's meant to be in.

**What remains before beta, beyond this slice:** the partial-payment
entry UX (letting a user type an amount instead of only confirming the
full suggested transfer) and the reversal/"Undo" UX (STEP 5) still need
real interface design and building in 7B; the owner-self-archive RLS gap
and household-creator-account-deletion restriction (both already
documented, pre-existing, unrelated to payments) remain open; leaked
password protection remains a Free-plan limitation; the deferred
unindexed-FK performance items remain deferred. None of these block
starting Migration 7A.

---

## Final report

**Current persistence gap:** "Mark as paid" only adds a transfer's
synthetic id to in-memory React state (`dismissedIds`) and appends a
session-local timeline entry; nothing reaches Supabase. A page reload,
household switch, or the underlying balance recomputing at all makes the
dismissal vanish and the real (still-unpaid) debt reappear.

**Recommended Payment domain model:** `id`, `household_id`,
`from_member_id`, `to_member_id`, `amount_minor`, `created_by_member_id`,
`created_at` (all required) + `note`, `reversal_of_payment_id`,
`client_dedupe_key` (optional, each independently justified). No
`status`, no `currency`, no `updated_at`.

**Money representation:** integer `amount_minor`, no per-row currency —
inherits `households.currency_code`, identical convention to every other
money column in this schema.

**Payment financial semantics:** `adjustedNet(member) = groceryNet(member)

- Σ(payments received) − Σ(payments sent)`, computed at the engine layer
(new `applyPayments`, extending `computeSettlement`) — never in the UI.
Grocery history and `spentMinorUnits`/`consumedMinorUnits` are never
  touched by a payment.

**Correction/reversal strategy:** Option B — payments are immutable
(no UPDATE/DELETE grant, ever); a correction is a new, exact-inverse
reversal row referencing the original via `reversal_of_payment_id`. One
UX pattern ("Undo this payment") covers accidental/wrong-amount/wrong-
recipient corrections.

**Authorization strategy:** any _active_ household member may record a
payment between any two members (active or archived) of their own
household — the same trust model `grocery_items_insert_active_member`
already applies; `created_by_member_id` is always server-derived from
`auth.uid()` via `private.household_member_id_for()`, never trusted from
client input. Archived members cannot record anything. All members
(active or archived) can read all historical payments. No one can
update or delete a payment, ever — not even its own creator or the
household owner.

**Cross-household protection:** composite FKs
`(from_member_id, household_id)` / `(to_member_id, household_id)` /
`(created_by_member_id, household_id)` → `household_members(id, household_id)`,
identical pattern to `grocery_item_consumers`; plus
`CHECK (from_member_id <> to_member_id)` and `CHECK (amount_minor > 0)`.

**Archive/account-deletion behavior:** unaffected in every case (payer
archived, recipient archived, Auth account deleted, display name
changed, household archived) — every reference is a stable
`household_members.id`, never a `profiles.id` or a display name, and
archival is always a status flip, never a deletion, exactly matching how
`grocery_items` already behaves.

**Settlement-engine integration:** a new, small, pure `applyPayments`
function sits between `calculateMemberBalances` and
`minimizeTransactions`; `computeSettlement` gains one new, optional,
backward-compatible parameter. Neither `calculateMemberBalances` nor
`minimizeTransactions` changes.

**History behavior:** unaffected — stays exactly `grocery_items`-derived
(Slice 5); a payment must never appear as a grocery.

**Analytics behavior:** unaffected — every Analytics total stays derived
from `spentMinorUnits`/`consumedMinorUnits`/raw grocery amounts; a
payment is never counted as spending.

**Timeline behavior:** `useSettlements`'s session-local `timeline` state
is replaced entirely by a pure derivation over real `payments` rows
(`buildPaymentTimeline`, same shape as Slice 5's `buildHistoryEntries`);
`Timeline.tsx`'s existing "No recorded payments yet." empty state is
preserved for a genuinely empty `payments` array — no fabricated entries
either way.

**Idempotency strategy:** client generates a `client_dedupe_key` UUID
once per user-initiated "mark as paid" action; a partial unique index on
`(household_id, client_dedupe_key)` gives real, server-enforced
duplicate protection, on top of (not instead of) a client-side in-flight
button guard.

**Recommended database table:** see STEP 12 in full — one new table,
`payments`, RLS enabled immediately, two policies (`select`, `insert`
only), immutability enforced by omitting UPDATE/DELETE grants entirely.

**Recommended RLS model:** see STEP 6/12 — `payments_select_member`
(any member, including archived, via `is_household_member(household_id, true)`)
and `payments_insert_active_member` (active members only, anti-
impersonation via `created_by_member_id = household_member_id_for(household_id)`).
No update/delete policy needed given no such grant exists.

**Migration sequence:** Migration 7A (schema + RLS only, no application
code) → Frontend Slice 7B (engine extension + hooks + UI), tested locally
end to end before either is ever applied/merged to hosted — same
two-step pattern already used for every real feature in this project.

**Frontend changes eventually required (7B, not now):** `src/engine/applyPayments.ts`
(new), `computeSettlement`'s signature extended, a `usePayments`/
`useHouseholdPayments` hook, `useSettlementResult` threading payments
through, `useSettlements` rewritten off session state, `Timeline.tsx`
wired to real data, a "Mark as paid" UX that accepts a (possibly partial)
amount instead of only confirming the suggested total, and an "Undo
payment" UX for reversals.

**Test plan:** see STEP 14 in full — engine-level unit tests (partial
payment, full payment, overpayment, multiple/opposing payments, 3-member
settlement with a non-suggested pair, one-paisa, large amount, reversal
math), RLS/adversarial tests (duplicate submission, cross-household,
impersonation, archived-member behavior, anon denial, no update/delete
for anyone), and Playwright tests (refresh persistence, timeline
truthfulness, account-deletion history preservation).

**Open design questions:**

1. Should recording a payment between two _other_ members (caller is
   party to neither) be as open as grocery-logging is today, or should
   payments — being more "final" than a grocery line — require the
   caller to be a party to the transaction, or be owner-only? This
   document recommends matching the existing grocery-logging trust model
   for consistency, but flags it as a real product decision, not a
   foregone one.
2. Exact reversal UX polish (e.g., visually pairing a reversal with the
   payment it reverses in the timeline) — functionally covered, visual
   treatment deferred to 7B implementation, not a blocker.
3. Whether an archived household can still accept new payments — this
   document defers to whatever the existing archived-household write
   rule already is, rather than inventing a new one.

**Blockers before implementation:** none technical — every dependency
(`households`, `household_members`, RLS helper functions, the engine's
pure-function architecture) already exists and needs no change. The only
prerequisite is a product decision on open question #1 above before
writing Migration 7A's INSERT policy.
