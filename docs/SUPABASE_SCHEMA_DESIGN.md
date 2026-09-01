# GroceryMate — Supabase Schema Design

**Status: design and audit, plus one locally-prepared migration.** Migration 1
(`profiles` / `households` / `household_members`) exists as a reviewable SQL
file under `supabase/migrations/` and has been validated against a local
Supabase stack. It has **not** been applied to the `grocerymate-dev` remote
project — see §15 for exactly what's been done and what hasn't.

This is written to double as interview prep — if you can walk through why
each decision was made, not just what it is, you can defend this
architecture under questioning.

---

## 1. What already exists (Step 1 findings)

Before designing anything, it's worth being precise about what GroceryMate
already has, because a surprising amount of the "hard part" is already
built — just not connected to a database yet.

### The domain layer (`src/domain/`) is already schema-shaped

This is the single most important finding. `src/domain/` was built in an
earlier phase as a persistence-agnostic model, and it already expresses
almost everything this schema needs:

| Domain type | What it models | Schema relevance |
|---|---|---|
| `Money` | `{ minorUnits: integer, currency: Currency }` | Exactly how money should be stored — integer minor units, never a float |
| `Currency` / `CURRENCIES` | `BDT\|USD\|EUR\|GBP\|INR`, each with `minorUnitDigits` | Currency is already a first-class concept, not hardcoded |
| `Household` | `{ id, name, currency, memberIds, createdAt }` | Maps almost directly to a `households` table |
| `Member` | `{ id, householdId, name, email, role } & (ActiveMember \| InvitedMember)` | Maps to `household_members` — **missing an `Archived` variant**, see §4 |
| `GroceryItem` | `{ id, householdId, name, category, unitPrice, quantity, paidByMemberId, sharedByMemberIds, addedAt, notes? }` | Maps to `grocery_items` + `grocery_item_consumers` |
| `Settlement` / `Payment` | Debt + payoff record types | Already anticipates a payments concept (§8) |
| `HistorySession` | Groups items+members into one shopping trip | A real, well-modeled concept — **not persisted in MVP**, see §9 |
| `Receipt` / `AIParsedItem` | Photo/pasted receipt → AI-extracted candidate items | AI-specific — **not part of this schema**, see below |
| `Brand<T, Name>` + `ids.ts` | Nominal-typed ids (`MemberId`, `GroceryItemId`, ...) | Directly reflects UUID primary keys, one per entity |

None of this is wired to a database — it was built as the target shape for
one, and this schema is that shape made real in Postgres.

### The engine (`src/engine/`) needs no changes

`computeSettlement(members, groceries, currency)` is pure: it takes plain
arrays in memory and returns balances/transfers. It has no idea whether
`members`/`groceries` came from `useState` or a Supabase query. This
schema is designed so the engine's inputs can be filled from real rows
with zero changes to `src/engine/*` — this was deliberate when it was
built, and it pays off now.

### The adapter layer (`src/adapters/`) is a temporary bridge, not a target

`toEngineInput`/`toSettlementViewModel`/`memberIdentity.ts` exist because
today's UI stores `GroceryItem.paidBy`/`sharedBy` as **display-name
strings**, resolved to ids at calculation time. Once `paidBy`/`sharedBy`
are real foreign keys to `household_members.id` from the moment a grocery
is created, most of this name↔id bridging becomes unnecessary. It isn't
being removed in this phase — this document is design-only — but it's
worth naming as a simplification the persistence work will eventually
unlock (§13).

### What's REAL DOMAIN DATA vs. TEMPORARY UI STATE vs. DERIVED vs. MOCK

This separation is the actual point of Step 1 — not everything currently
sitting in a frontend object deserves a column.

**Real current domain data (needs persistence):**
- Household identity (name, currency)
- Household membership (who's in it, their role, their status, account link)
- Grocery items (name, amount, category, who paid, when)
- Who shares each grocery item

**Temporary UI state (must NOT be persisted):**
- `useGroceries`'s `panelOpen`, `editingId`, `pendingDeletes` (the 5-second
  undo window), `lastAddedId` (highlight animation)
- `useMembers`'s `search`, `sortBy`, `dialogOpen`, `profileId`
- `useSettlements`'s `dismissedIds` (the session-only "Mark as paid"
  dismissal — see §8, this is deliberately non-authoritative today)
- Landing/onboarding animation state, design-system showcase toggles

**Derived data (must NOT be persisted — recomputed from source rows):**
- `spentMinorUnits` / `consumedMinorUnits` / `netBalanceMinorUnits` per
  member (`MemberSettlementSummary`)
- Settlement transfers (`DebtTransfer[]` — who should pay whom)
- "Outstanding total," member status badges (`owed`/`owes`/`settled`)
- Everything `useAnalytics()` computes

See §7 for why, and the one real exception.

**Mock/demo data (stays exactly as mock, not part of this schema):**
- `store/history.ts`'s 9 fabricated shopping sessions (Analytics/History
  pages) — see §9
- `store/household.ts`'s `mockMembers`/`mockUser` used only by the Landing
  page's pre-login decorative mockup (not the live app — already fixed
  everywhere it mattered financially in the previous phase)
- `Receipt`/`AIParsedItem` domain types — real AI receipt scanning is not
  part of this MVP; nothing currently produces or consumes them

---

## 2. Core persisted entities (MVP)

Five tables. Each one earns its place against real, current frontend
concepts — nothing here exists because a future feature "might" need it.

### `profiles`

**Purpose:** one row per authenticated Supabase user — the account
identity, independent of any household.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | not null, PK | Same value as `auth.users.id` (1:1) |
| `email` | `text` | not null | Mirrored from `auth.users` for convenient querying |
| `display_name` | `text` | not null | What `Member.name` is today |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

- **PK:** `id` (shared with `auth.users`, not a separate surrogate key)
- **FK:** `id → auth.users(id)`, `ON DELETE CASCADE` (if a Supabase auth
  user is deleted, their profile goes with it — but see §11, this should
  be rare and deliberate)
- Populated by a trigger on `auth.users` insert (standard Supabase
  pattern) — **not implemented in this phase**, just planned for

### `households`

**Purpose:** one row per household — the unit everything else belongs to.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | not null, PK, default `gen_random_uuid()` | |
| `name` | `text` | not null | e.g. "Flat 4B" |
| `currency_code` | `text` | not null, default `'BDT'` | CHECK against the same 5 codes as `CurrencyCode` |
| `created_by` | `uuid` | not null | FK → `profiles(id)`. Provenance only — not "current owner," see §3 |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

- **PK:** `id`
- **FK:** `created_by → profiles(id)`, `ON DELETE RESTRICT` (a household
  should never lose its provenance record silently)
- No `owner_id` column — ownership is a **role** on `household_members`,
  not a household-level pointer (see §3 for why)

### `household_members`

**Purpose:** the most important table in this schema — a person's
participation in one household. See §3 for the full membership design;
this is the column reference.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | not null, PK, default `gen_random_uuid()` | This is `MemberId` — what `grocery_items`/`grocery_item_consumers` reference |
| `household_id` | `uuid` | not null | FK → `households(id)`, `ON DELETE CASCADE` |
| `profile_id` | `uuid` | **nullable** | FK → `profiles(id)`, `ON DELETE SET NULL`. Null = no account (invited-pending or permanently account-less) |
| `display_name` | `text` | not null | The name shown/used regardless of account status — see §3 |
| `invited_email` | `text` | nullable | Set only while `status = 'invited'`, used to resolve the invite to a real account later |
| `role` | `text` | not null, default `'member'` | `'owner' \| 'member'`, CHECK-constrained |
| `status` | `text` | not null, default `'active'` | `'active' \| 'invited' \| 'archived'`, CHECK-constrained |
| `invited_at` | `timestamptz` | nullable | Set when `status` first becomes `'invited'` |
| `joined_at` | `timestamptz` | nullable | Set when `status` first becomes `'active'` |
| `archived_at` | `timestamptz` | nullable | Set when `status` becomes `'archived'` |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

- **PK:** `id`
- **FKs:** `household_id → households(id)` `ON DELETE CASCADE`;
  `profile_id → profiles(id)` `ON DELETE SET NULL` (losing an account
  should never destroy the membership row or its financial history — the
  member becomes account-less, not gone)
- **Unique constraint:** `UNIQUE (household_id, id)` — not for
  deduplication (that's not the risk here), but so `grocery_items`/
  `grocery_item_consumers` can use a **composite foreign key** against
  `(id, household_id)` together. This is the schema-level fix for
  "payer/consumer from another household" — see §11.
- **Partial unique index (recommended):** `UNIQUE (household_id, profile_id) WHERE profile_id IS NOT NULL` —
  the same real person (by account) can't have two membership rows in the
  same household. Deliberately does **not** apply to `display_name`: two
  account-less members can validly share a name (see §11's duplicate-name
  discussion — this is exactly the ambiguity `src/adapters/memberIdentity.ts`
  already had to handle for the current name-keyed UI).
- **Check constraint:** `role = 'owner' → profile_id IS NOT NULL` — an
  owner performs authenticated actions (invite, manage settings), so an
  account-less owner doesn't make sense.
- **Indexes:** `household_id` (list members of a household — the most
  common query), `profile_id` (find "which households am I in").

### `grocery_items`

**Purpose:** one purchased line item. Enough data to reconstruct the
settlement calculation exactly — nothing more.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | not null, PK, default `gen_random_uuid()` | |
| `household_id` | `uuid` | not null | FK → `households(id)`, `ON DELETE CASCADE` |
| `name` | `text` | not null | |
| `category` | `text` | not null, default `'pantry'` | CHECK against the 6 `GROCERY_CATEGORIES` values |
| `amount_minor` | `integer` | not null, CHECK `> 0` | **Total** cost of this line — see §6 on why this isn't split into unit price × quantity |
| `quantity` | `integer` | not null, default `1`, CHECK `> 0` | Informational only — display, not re-multiplied into `amount_minor` |
| `paid_by_member_id` | `uuid` | not null | Composite FK — see below |
| `notes` | `text` | nullable | |
| `created_at` | `timestamptz` | not null, default `now()` | |
| `updated_at` | `timestamptz` | not null, default `now()` | |

- **PK:** `id`
- **FK (household):** `household_id → households(id)`, `ON DELETE CASCADE`
- **FK (payer, composite):** `(paid_by_member_id, household_id) REFERENCES household_members(id, household_id)` —
  this single constraint makes "a payer from another household" a
  schema-level impossibility, not just an RLS/application check (§11)
- No `currency_code` column — inherits the household's currency (§6)
- **Indexes:** `household_id` (list a household's groceries — the primary
  query), `paid_by_member_id` (a member's "amount paid" lookups)
- **Delete behavior:** hard delete allowed (a grocery item, unlike a
  member, has no onward references that need preserving) — but see the
  existing frontend's soft-delete-with-undo UX, which is a **UI**
  behavior, not a schema requirement; the schema just needs to support a
  real `DELETE`

### `grocery_item_consumers`

**Purpose:** who shares a grocery item's cost — a real relation table, not
name strings.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `grocery_item_id` | `uuid` | not null | FK → `grocery_items(id)`, `ON DELETE CASCADE` |
| `household_member_id` | `uuid` | not null | Composite FK — see below |
| `household_id` | `uuid` | not null | Denormalized — see below |
| `created_at` | `timestamptz` | not null, default `now()` | |

- **PK:** composite `(grocery_item_id, household_member_id)` — this
  alone makes a duplicate consumer record (the same member listed twice
  for the same item) structurally impossible, satisfying Step 5's
  uniqueness requirement and one of Step 11's threats in one constraint.
- **FK (item):** `grocery_item_id → grocery_items(id)`, `ON DELETE CASCADE`
- **FK (member, composite):** `(household_member_id, household_id) REFERENCES household_members(id, household_id)` —
  same cross-household protection as the payer FK above.
- **Why `household_id` is denormalized here:** it's technically derivable
  by joining through `grocery_item_id → grocery_items.household_id`, but
  storing it directly is what makes the composite-FK integrity check
  above possible without a trigger. It's set once at insert and never
  changes (grocery items don't move between households — see §11), so
  there's no real sync risk. This is a deliberate, small denormalization
  traded for a strong, always-on, schema-level guarantee.
- **No surrogate `id`:** a pure junction table doesn't need one.

### Nothing else is required for MVP

`payments` (§8) and a shopping-session/history table (§9) are both real,
reasonable ideas — and both are deliberately **not** part of the MVP five.
The reasoning for each is in its own section below.

---

## 3. Household membership model

This is the decision the prompt correctly flags as critical, because
getting it wrong either blocks real-world use (forcing everyone to have
an account before they can be added) or corrupts financial history
(losing who was involved once someone leaves).

**The core move: membership identity is independent of account identity.**
`household_members.profile_id` is nullable. A `household_members` row is
what `grocery_items`/`grocery_item_consumers` reference — never
`profiles` directly. This one decision is what makes every case below
representable without special-casing:

| Case | `profile_id` | `status` | `role` | Notes |
|---|---|---|---|---|
| **Owner** | set (required by CHECK) | `active` | `owner` | The person who created the household, or who's since been made owner |
| **Joined member** | set | `active` | `member` | Has an account, has accepted |
| **Invited member** | `NULL` | `invited` | `member` | `invited_email` set; becomes `active` + gets a `profile_id` the moment they sign up and accept — **same row**, so any future references stay valid |
| **Non-account participant** | `NULL` | `active` | `member` | Someone who shares costs but will never log in themselves (a housemate who doesn't want the app, a child, etc.) — `display_name` is their only identity |
| **Inactive / archived member** | unchanged from before archiving | `archived` | unchanged | See §4 |

The key insight: **"has an account" and "membership lifecycle stage" are
two independent dimensions**, not one combined enum. `status` tracks
lifecycle (`active`/`invited`/`archived`); `profile_id IS NULL` vs. set
tracks account linkage. Crossing them gives every case in the table above
without a combinatorial explosion of status values.

`display_name` exists on `household_members` (not just pulled from
`profiles.display_name`) because an account-less member has no profile to
pull from at all, and even an account-holding member might reasonably
want a household-specific display name later. It's the field
`grocery_item_consumers`/`grocery_items.paid_by_member_id` ultimately
resolve to for display — never a `profiles` join for financial UI.

**What this deliberately does NOT do (keeping MVP complexity down):**
- No separate "pending invite" table — an invite is just a
  `household_members` row with `status = 'invited'`.
- No multi-household role hierarchy beyond `owner`/`member`.
- No "invite expiry" mechanic — an invited row with no account after a
  long time is just... still invited. Fine for MVP.

---

## 4. Archive vs. delete

**Requirement, restated:** a member who has participated in a historical
grocery must remain resolvable after being removed from the active
household.

**Decision: archive, not hard-delete, for anyone with any financial
history.** This is enforced at the schema level, not just by convention:

```
grocery_items.paid_by_member_id            → household_members(id)   ON DELETE RESTRICT (via composite FK)
grocery_item_consumers.household_member_id → household_members(id)   ON DELETE RESTRICT (via composite FK)
```

A composite foreign key with the default `ON DELETE RESTRICT` behavior
means Postgres **itself refuses** a hard `DELETE` on a `household_members`
row as long as any `grocery_items`/`grocery_item_consumers` row still
points to it. There is no way for the application to accidentally
corrupt history here, even with a bug — the database is the backstop.

### The three states, precisely

- **`active`** — a real, current member. Selectable as a payer or sharer
  for new groceries. Shown in the default member list.
- **`archived`** — was a member, isn't anymore. **Not** selectable for
  new groceries (the application query that builds picker options simply
  filters `WHERE status = 'active'` — the exact same pattern
  `src/hooks/useMemberOptions.ts` already uses today for excluding
  `invited` members, just extended to also exclude `archived`). Every
  past `grocery_items`/`grocery_item_consumers` reference to them stays
  fully intact and resolvable — their `display_name` still renders
  correctly on old grocery cards and in past balance calculations.
- **`invited`** — not yet active. Same "not selectable as a financial
  participant yet" treatment, for the opposite reason (hasn't started,
  not because they've left).

### When is a real hard `DELETE` actually safe?

Only when the row has **zero** `grocery_items`/`grocery_item_consumers`
references — which the `ON DELETE RESTRICT` constraint already
guarantees the database will refuse otherwise, so this isn't a rule the
application has to remember to check; it's structurally true. Concretely
that means:

- An **invited** member whose invite is withdrawn or expires, having
  never become active (so by definition they can't have paid for or
  shared anything) — safe to hard-delete.
- A member added by mistake seconds ago, with no groceries yet attached —
  safe to hard-delete (this is effectively what "cancel" means for an
  in-progress add).
- Anyone else: the application should call this "archive" in the UI, not
  "remove" or "delete," and the underlying operation is an `UPDATE
  household_members SET status = 'archived', archived_at = now()`, never
  a `DELETE`.

**One real domain-model consequence of this decision:** `src/domain/Member.ts`
currently only has `ActiveMember | InvitedMember` — no archived variant.
Adding one (`ArchivedMember { membershipStatus: 'archived', archivedAt: Date }`)
is a small, natural extension needed once real persistence work begins —
noted here so it isn't a surprise later, not something changed in this
design-only phase.

---

## 5. Grocery data model

Already specified in full in §2's `grocery_items`/`grocery_item_consumers`
tables. Two decisions worth calling out explicitly:

**Consumers are a relation table, never name strings.** This is the
single most important structural fix over today's frontend, where
`GroceryItem.paidBy`/`sharedBy` are display-name strings resolved at
calculation time (`src/adapters/memberIdentity.ts` exists specifically to
paper over this). Once persisted, `paid_by_member_id` and
`grocery_item_consumers.household_member_id` are real foreign keys from
the moment a grocery is created — a display name can never be
financially meaningful data again, by construction.

**`amount_minor` is the line total, not `unit_price × quantity`.** The
current in-memory domain model (`GroceryItem.unitPrice: Money` +
`quantity: number`, multiplied by the engine) is slightly different from
what's proposed here. The schema stores one integer: what was actually
paid for that line, full stop. `quantity` stays as an informational
integer for display ("× 2" on a grocery card) but is **not** re-multiplied
during settlement calculation — the persisted `amount_minor` already is
the true total. This is a deliberate simplification: it removes an entire
class of "did I multiply price × quantity twice" bug, matches how a
receipt actually reads (one total per line), and is easier for a user to
correct later (editing a wrong total doesn't require reverse-engineering
whether the unit price or the quantity was wrong).

---

## 6. Money

**Postgres type: `integer`**, storing exact minor units (paisa for BDT),
never a `numeric`/`decimal`/`real`/`float`/`double precision` column.
This is a direct continuation of the philosophy already built into
`src/domain/Money.ts` and `src/adapters/parseMoneyInput.ts` — the
database should be a faithful mirror of that, not a second, different
implementation of the same "never lose a paisa" guarantee.

`integer` (max ~2.1 billion) comfortably covers any realistic single
grocery line (~৳21 million) with enormous headroom, and Postgres's
`SUM()` aggregate over an `integer` column automatically widens to avoid
overflow — so per-row `integer` doesn't create a household-total ceiling.
`bigint` is an equally valid, more conservative alternative if the extra
headroom (basically free in storage cost) is preferred; either is fine,
this document recommends `integer` as sufficient.

**Currency belongs on `households`, not `grocery_items` (or anywhere
else).** Three reasons, in order of how load-bearing they are:

1. **The product already treats currency as a household-wide setting.**
   `useSettings.ts`'s currency picker (`CURRENCY_OPTIONS`) is already a
   single value, not per-item — the schema should match the product as
   it already presents itself, not invent a finer grain nothing asks for.
2. **Per-item currency would require the settlement engine to do currency
   conversion** to produce a single net balance per member — a real,
   much bigger feature (exchange rates, conversion timing, rounding
   rules for the conversion itself) that nothing in this product needs.
3. **It closes off an entire bug class by construction.** With currency
   only on `households`, `MixedCurrencyError` (which the engine already
   defends against defensively) becomes something the *schema* makes
   impossible to create in the first place — there's no column on
   `grocery_items` where a mismatched currency could even be recorded.

This doesn't block future multi-currency support: if it's ever genuinely
needed, a nullable `currency_code` override column could be added to
`grocery_items` later (defaulting to the household's currency when null)
without breaking anything already stored — but that's a real feature
with its own design work, not something this schema needs to anticipate
now. BDT-only for the current UI; the domain model's `Currency` type and
this schema's `households.currency_code` already keep the door open.

---

## 7. Derived data

**Default rule, and this MVP has no exception to it for anything in the
frontend today:** if `src/engine/computeSettlement()` can produce a value
from `household_members` + `grocery_items` + `grocery_item_consumers`
alone, that value is **never** persisted. Recompute it on read.

Explicitly not stored:
- `spentMinorUnits` / `consumedMinorUnits` / `netBalanceMinorUnits` per member
- Settlement transfers (`DebtTransfer[]` — the "who should pay whom" suggestions)
- "Outstanding total" (Settlements page summary)
- Member status badges (`owed`/`owes`/`settled`)

**Why this isn't a performance risk at this scale:** a household's
grocery log is realistically dozens to a few hundred rows. Recomputing a
full settlement on every page load is trivially fast — there is no
caching justification here, only a correctness risk (derived data
silently drifting from its source) with no offsetting benefit. This
mirrors exactly what the engine already does in memory today; persisting
a cached copy would be solving a performance problem that doesn't exist
while introducing a consistency problem that would.

**The one real exception: recorded payments (§8) are NOT derived.** A
payment is a historical *event* — money that actually changed hands. It
cannot be recomputed from grocery data, because grocery data alone has no
way to know whether a suggested transfer was ever actually paid. This is
genuinely new source-of-truth information, which is exactly why §8
proposes a real table for it rather than a cached/derived field.

---

## 8. Payments / Mark Paid

**Design, not implement — this section describes the shape without
writing the reconciliation logic that would consume it.**

### The table: `payments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | not null, PK, default `gen_random_uuid()` | |
| `household_id` | `uuid` | not null | FK → `households(id)`, `ON DELETE CASCADE` |
| `from_member_id` | `uuid` | not null | Composite FK → `household_members(id, household_id)` — who paid |
| `to_member_id` | `uuid` | not null | Composite FK → `household_members(id, household_id)` — who received it |
| `amount_minor` | `integer` | not null, CHECK `> 0` | No currency column — inherits `households.currency_code`, same reasoning as §6 |
| `note` | `text` | nullable | Free-text context ("cash, Tuesday") |
| `recorded_by_profile_id` | `uuid` | nullable | FK → `profiles(id)`. The **account** that entered this record — distinct from `from_member_id`/`to_member_id`, which are household members and may not have accounts at all |
| `created_at` | `timestamptz` | not null, default `now()` | |

- **Check constraint:** `from_member_id <> to_member_id` — no
  self-payment, mirroring the same guarantee the engine's
  `minimizeTransactions` already provides structurally for its own
  suggested transfers.
- **No `status` field.** A payment either exists or it doesn't — see
  immutability below for why "pending"/"confirmed" isn't needed.

### Payments are immutable

Once inserted, a payment row is never `UPDATE`d (amount, parties) and
never `DELETE`d. This is the same "never silently repair financially
meaningful data" principle that's run through this entire project. A
**correction is a new row** — a reversal payment in the opposite
direction (or a corrected replacement), with a `note` explaining why, not
an edit to the original. This keeps the payments table a genuine,
append-only ledger: at any point, replaying every row in order gives the
true history, which an editable ledger can never quite promise.

(Enforcing true immutability — refusing `UPDATE`/`DELETE` outright rather
than just the application not offering it — is a small trigger or simply
omitting `UPDATE`/`DELETE` grants in RLS for normal users. Worth doing
when this table is actually built; not solved further here.)

### How a recorded payment would affect remaining balances (concept only)

The engine's `computeSettlement()` produces suggested transfers from
grocery data alone. Once payments exist, the **remaining** amount owed
between any two members becomes:

```
remaining(A → B) = engine_suggested_transfer(A → B) − sum(payments from A to B)
```

clamped so it never goes negative (an overpayment doesn't flip into B
owing A without a deliberate product decision about what that should
mean). This reconciliation step is genuinely new logic that doesn't exist
yet anywhere in `src/engine/` or `src/adapters/` — designing it precisely
(overpayment handling, whether a payment can apply against a transfer
that didn't exist yet when it was recorded, etc.) is real implementation
work for when this table is actually built, not this document.

### Does this belong in the first migration?

**No.** Recommended as its own, later migration (Migration 4, §13), after
grocery persistence and RLS are live and working. Reasons:

1. "Mark as paid" already has an honest, working non-persistent behavior
   today (session-local dismissal, explicitly not pretending to be real —
   this was a deliberate product decision from the previous phase, not
   an oversight).
2. Payments introduce their own authorization surface ("can I record a
   payment on someone else's behalf?") better designed once the simpler
   grocery-splitting core has real usage to learn from.
3. Keeping Migration 1 minimal reduces the risk of the very first
   production migration.

---

## 9. History / shopping sessions

**Recommendation: do not add a `shopping_sessions` (or `grocery_trips`)
table for MVP.**

`src/domain/HistorySession.ts` is a real, coherent, already-designed
concept — grouping several `GroceryItem`s bought together into one named
trip. It's a legitimate future feature, not a mistake. But it's also not
required for MVP correctness: the settlement engine has no concept of
"sessions" at all — it only needs the flat grocery + consumer data.

**The current, persisted `grocery_items` log is itself a truthful
history**, once it exists for real: sorted by `created_at desc`, grouped
by day if wanted for display, it already shows what was bought, by whom,
and when — which is most of what today's (fabricated) History page tries
to show. The difference is honesty: today's `store/history.ts` is 9
invented sessions spanning months that never happened; a real, persisted
grocery log is however much real history actually exists, which starts
at zero and grows truthfully. Per the explicit instruction not to invent
artificial historical data, that's exactly the right MVP answer — ship
with an honestly-empty history rather than a populated but fake one.

**The trade-off, named plainly:** without a session-grouping table, the
UI loses "trip" framing ("Weekly restock — ৳2,090") in favor of a plain
chronological item list. That's a real UX regression versus today's mock
if shipped naively — but it's a *display* concern to solve later (e.g.,
grouping consecutive same-day items in the UI query, with no schema
change) rather than a reason to add a whole table now on a guess about
whether users will actually want explicit trip-grouping. Add
`shopping_sessions` later if and when real usage shows it's wanted.

---

## 10. Authorization model (RLS intent)

**Core invariant, restated:** a user must never read or modify another
household's data unless they're an authorized member of that household.
Everything below is policy *intent* — the actual SQL is Migration 3
(§13), not written here.

The building block every policy uses: `auth.uid()` (Supabase's current
authenticated user) checked against `household_members.profile_id`.

### `households`

- **SELECT:** allowed to any member (active or archived) of the
  household — an archived member should still be able to see the
  household they were once part of, consistent with §4's "past
  references stay resolvable" principle applied to viewing, not just to
  FK integrity.
- **UPDATE** (name, currency): **owner-only.**
- **INSERT:** any authenticated user (creating a new household) — the
  creator becomes its first `household_members` row with `role='owner'`
  in the same transaction/flow.
- **DELETE:** not exposed to normal users in MVP. Whether a household can
  ever truly be deleted (vs. archived like a member) is an open question
  (§14) — not resolved here.

### `household_members`

- **SELECT:** any active or archived member of the same household —
  everyone needs to see their current and past housemates.
- **INSERT** (adding/inviting a member): open design question — see §14.
  Both "owner-only" and "any active member" are defensible; today's
  frontend has no such restriction at all.
- **UPDATE own row** (e.g. color tone): the member whose `profile_id =
  auth.uid()`.
- **UPDATE status → archived:** owner-only for archiving *someone else*;
  self-archiving (a member removing themselves) allowed on one's own row.
- **DELETE:** not exposed via RLS to normal users at all — even where a
  hard delete would be schema-safe (§4), it should go through an
  application path that's deliberate about it, not a raw `DELETE` grant.

### `grocery_items` and `grocery_item_consumers`

- **SELECT/INSERT/UPDATE/DELETE:** scoped to households where the current
  user is an **active** member (`status = 'active'`) — archived members
  keep SELECT (matching the households policy) but lose write access.
- **INSERT/UPDATE `WITH CHECK`:** must also verify `paid_by_member_id`
  (or `household_member_id` for consumers) actually belongs to the same
  `household_id` being written — redundant with the composite FK (§11),
  but RLS's `WITH CHECK` clause is cheap insurance at the same boundary,
  worth having in both layers.
- Whether write access should further narrow to "only the item's own
  creator can edit/delete it" is an open question (§14) — today's
  frontend lets any member edit/delete any item, and this design
  preserves that unless told otherwise.

### Invited / non-account participants

Have no `auth.uid()` at all until they accept an invite and create an
account — until then they cannot authenticate to Supabase, period. Their
`household_members` row is entirely controlled by whoever inserted it.
The moment they sign up and their `profile_id` gets linked, ordinary
active-member RLS applies to them from then on, unchanged.

---

## 11. Threat / integrity review

| Risk | Primary defense | Layer(s) |
|---|---|---|
| Guessing/enumerating household ids | Non-sequential `uuid` PKs (defense in depth) + RLS SELECT scoping | Schema + RLS |
| Changing a `grocery_items.household_id` to move it into another household | RLS `UPDATE ... WITH CHECK` re-validates the new `household_id`; consider disallowing `UPDATE` of this column entirely via a trigger | RLS + application (+ optional trigger) |
| A payer id belonging to another household attached to a grocery | **Composite FK** `(paid_by_member_id, household_id) REFERENCES household_members(id, household_id)` — structurally impossible, not just checked | **Schema** (primary), RLS `WITH CHECK` (redundant insurance) |
| Same, for consumers | Same composite-FK pattern on `grocery_item_consumers`, using its denormalized `household_id` | **Schema** (primary) |
| Duplicate consumer records (same member listed twice on one item) | Composite PK `(grocery_item_id, household_member_id)` | **Schema** — cannot happen |
| Deleted/archived member references going stale | `ON DELETE RESTRICT` makes hard-delete-while-referenced impossible; archived rows are simply excluded from *new*-selection queries, never from historical resolution | **Schema** (integrity) + application (selection filtering) |
| Unauthorized household membership changes (adding/removing someone else's membership) | Owner-only (or active-member, per §14's open question) INSERT/UPDATE policies | RLS |
| Service-role key exposed to the frontend | Never referenced by any `VITE_`-prefixed env var or shipped in a client bundle; only used server-side (Edge Functions / trusted server context); all frontend calls use the anon key + RLS | **Application/deployment discipline** — RLS is irrelevant here, since the service-role key bypasses RLS by design. This is a process rule, not a database design |

---

## 12. Proposed MVP schema (reference)

Types below use standard Postgres names; `uuid` assumes the
`pgcrypto`/`pgcrypto`-adjacent `gen_random_uuid()` default already
available on Supabase projects.

```
profiles
  id                  uuid         PK, FK → auth.users(id) ON DELETE CASCADE
  email               text         NOT NULL
  display_name        text         NOT NULL
  created_at          timestamptz  NOT NULL DEFAULT now()
  updated_at          timestamptz  NOT NULL DEFAULT now()

households
  id                  uuid         PK DEFAULT gen_random_uuid()
  name                text         NOT NULL
  currency_code       text         NOT NULL DEFAULT 'BDT'
                                   CHECK (currency_code IN ('BDT','USD','EUR','GBP','INR'))
  created_by          uuid         NOT NULL, FK → profiles(id) ON DELETE RESTRICT
  created_at          timestamptz  NOT NULL DEFAULT now()
  updated_at          timestamptz  NOT NULL DEFAULT now()

household_members
  id                  uuid         PK DEFAULT gen_random_uuid()
  household_id        uuid         NOT NULL, FK → households(id) ON DELETE CASCADE
  profile_id          uuid         NULL, FK → profiles(id) ON DELETE SET NULL
  display_name        text         NOT NULL
  invited_email       text         NULL
  role                text         NOT NULL DEFAULT 'member'
                                   CHECK (role IN ('owner','member'))
  status              text         NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','invited','archived'))
  invited_at          timestamptz  NULL
  joined_at           timestamptz  NULL
  archived_at         timestamptz  NULL
  created_at          timestamptz  NOT NULL DEFAULT now()
  updated_at          timestamptz  NOT NULL DEFAULT now()
  CHECK (role <> 'owner' OR profile_id IS NOT NULL)
  UNIQUE (household_id, id)                                    -- enables composite FKs below
  UNIQUE (household_id, profile_id) WHERE profile_id IS NOT NULL
  INDEX (household_id)
  INDEX (profile_id)

grocery_items
  id                  uuid         PK DEFAULT gen_random_uuid()
  household_id        uuid         NOT NULL, FK → households(id) ON DELETE CASCADE
  name                text         NOT NULL
  category            text         NOT NULL DEFAULT 'pantry'
                                   CHECK (category IN ('produce','dairy','bakery','pantry','beverages','household'))
  amount_minor        integer      NOT NULL CHECK (amount_minor > 0)
  quantity            integer      NOT NULL DEFAULT 1 CHECK (quantity > 0)
  paid_by_member_id   uuid         NOT NULL
  notes               text         NULL
  created_at          timestamptz  NOT NULL DEFAULT now()
  updated_at          timestamptz  NOT NULL DEFAULT now()
  FOREIGN KEY (paid_by_member_id, household_id)
    REFERENCES household_members (id, household_id)
  INDEX (household_id)
  INDEX (paid_by_member_id)

grocery_item_consumers
  grocery_item_id       uuid         NOT NULL, FK → grocery_items(id) ON DELETE CASCADE
  household_member_id   uuid         NOT NULL
  household_id           uuid         NOT NULL   -- denormalized, see §2/§11
  created_at             timestamptz  NOT NULL DEFAULT now()
  PRIMARY KEY (grocery_item_id, household_member_id)
  FOREIGN KEY (household_member_id, household_id)
    REFERENCES household_members (id, household_id)

-- Deferred to a later migration, not MVP (see §8):
payments
  id                      uuid         PK DEFAULT gen_random_uuid()
  household_id            uuid         NOT NULL, FK → households(id) ON DELETE CASCADE
  from_member_id           uuid         NOT NULL
  to_member_id             uuid         NOT NULL
  amount_minor             integer      NOT NULL CHECK (amount_minor > 0)
  note                     text         NULL
  recorded_by_profile_id   uuid         NULL, FK → profiles(id)
  created_at               timestamptz  NOT NULL DEFAULT now()
  CHECK (from_member_id <> to_member_id)
  FOREIGN KEY (from_member_id, household_id) REFERENCES household_members (id, household_id)
  FOREIGN KEY (to_member_id, household_id)   REFERENCES household_members (id, household_id)
```

Explicitly excluded from this schema: Analytics-specific tables (Analytics
stays derived from `grocery_items` once real, or mock — never its own
table) and AI/receipt tables (`Receipt`, `AIParsedItem` — no AI feature is
part of this MVP's persistence).

---

## 13. Migration plan

**Migration 1 — identity and membership**
`profiles`, `households`, `household_members`, plus the `auth.users`
insert trigger that creates a `profiles` row. This is the dependency root
everything else needs; nothing here depends on grocery data existing yet.

**Migration 2 — grocery persistence**
`grocery_items`, `grocery_item_consumers`, including the composite FKs
against `household_members`. Depends on Migration 1's tables existing.

**Migration 3 — RLS policies**
Enable RLS on all four tables above and write the policies described in
§10. Deliberately its own migration, after the tables exist, so policy
logic can be iterated on without touching table shape.

**Migration 4 — payments (later, not committed to a date)**
The `payments` table from §8, once the core is live and proven. Its own
RLS policies ship alongside it.

This order differs from a naive "everything at once" only in keeping
`payments` separate — everything else has to exist before RLS can be
written against it, and RLS has to exist before grocery reads/writes are
genuinely safe to expose to real users at all.

### What the frontend adapter layer will need to change (later, not now)

- `useGroceries`/`useMembers` move from `useState(initialX)` to real
  Supabase queries — a genuine architectural change, not attempted here.
- `src/adapters/toEngineInput.ts`'s name→id resolution
  (`memberIdentity.ts`) becomes largely unnecessary once `GroceryItem`
  itself is refactored to store `paidByMemberId`/`sharedByMemberIds` as
  real ids from creation, rather than display names resolved later. That
  refactor touches the `GroceryItem` UI type, `GroceryForm`, and
  `GroceryCard`'s display logic — real work, explicitly not started here.

### What stays unchanged

- `src/domain/*` — already shaped correctly (with the one small
  `ArchivedMember` addition noted in §4).
- `src/engine/*` — takes plain arrays, doesn't know or care where they
  came from. This is the payoff of having built it persistence-agnostic
  from the start.
- `src/adapters/toSettlementViewModel.ts` and `describeSettlementError.ts` —
  still the right shape for turning an engine result into UI-ready data,
  regardless of where the engine's inputs were sourced from.

### Migrating from current local/mock state

There is no real user data to migrate — everything today is
session-local UI state by design (the whole point of the last several
phases was proving the UI and the engine correctly before persistence
existed). The existing mock seed data (`store/groceries.ts`,
`store/members.ts`) is a reasonable candidate for a **local development
seed script** (`supabase/seed.sql`) so a fresh local Supabase instance
starts with a recognizable household to develop against — a developer
convenience, not a data migration.

---

## 14. Open questions

Decisions this document deliberately left open rather than guessing:

1. **Should adding/inviting a household member be owner-only, or any
   active member?** Today's frontend has no restriction at all. Both are
   defensible; this changes an RLS policy (§10), not the schema.
2. **Should editing/deleting a grocery item be restricted to the member
   who logged it?** Today's frontend lets any member edit/delete any
   item. This design preserves that permissive model by default —
   confirm whether that's actually desired before RLS is written.
3. **Payment reconciliation algorithm** (§8): how a recorded payment
   reduces a suggested transfer, including overpayment handling. Real
   design work for whenever Migration 4 is actually planned.
4. **Is `created_by_member_id` (who logged an item, distinct from who
   paid) worth adding now?** No current UI or domain concept backs "who
   added this," so it was deliberately left out per "don't add columns
   for a feature that doesn't exist yet" — flagging it since it's a
   small, plausible near-future addition.
5. **Should a household itself ever be hard-deletable**, or does the
   archive principle (§4) extend to households too? Not resolved here.
6. **Multi-currency per household** — explicitly out of scope; the
   schema doesn't block adding it later (§6).

---

## 15. Migration 1 implementation notes

Covers `supabase/migrations/20260901144228_foundation_profiles_households_household_members.sql` —
`profiles`, `households`, `household_members` only, prepared and validated
locally. Not applied to the `grocerymate-dev` remote project.

### Where this differs from §2–§12 above, and why

- **`households` gained a `status` column (`'active' | 'archived'`) plus
  `archived_at`.** The original design in §2 didn't give households their
  own lifecycle — only §14's open question #5 raised it. Migration 1
  answers that question: yes, using the exact same `status` pattern
  `household_members` already established, rather than inventing
  different terminology for the same idea one level up. A household can
  now be wound down without deleting it, consistent with the archive
  principle §4 already applies to members. *Not* resolved: whether a
  household should ever be truly hard-deletable — `status = 'archived'`
  is the only lifecycle exit implemented.
- **`profiles.email` got its own unique index.** Belt-and-suspenders:
  `auth.users.email` is already unique, but nothing yet keeps the two in
  sync automatically (see the missing trigger, next).
- **No `auth.users` → `profiles` signup trigger.** Reacting to account
  creation is Auth-implementation machinery, which this phase explicitly
  excludes. Consequence, stated plainly: **no `profiles` row is created
  automatically today.** Something — a trigger, or an application-level
  "ensure my profile row exists" call on first login — has to fill this
  gap before real signups happen, or `household_members.profile_id` and
  `households.created_by` have nothing to point to.

### The owner invariant

"A household has exactly one owner" splits into two rules of genuinely
different enforceability:

- **At most one owner per household — enforced, today, in the database.**
  `household_members_one_owner_per_household` is a partial unique index
  on `(household_id) WHERE role = 'owner'`. Postgres will reject a second
  `role = 'owner'` row for the same household outright.
- **At least one owner per household — not a schema-level guarantee, and
  said so directly in the migration's own comments rather than faked.** A
  CHECK constraint or index can't express "a matching row must exist
  somewhere else in this table" — that's a cross-row existence rule.
  Enforcing it fully would need a deferred constraint trigger evaluated
  at transaction commit, watching every INSERT/UPDATE/DELETE that could
  leave a household ownerless. That's legitimate complexity for a real
  invariant — not something to add "for free" just to check a box, per
  this phase's explicit instruction not to reach for an elaborate trigger
  to *claim* the invariant is solved. **It is not implemented.**

  What holds the "at least one" half together until/unless that trigger
  is ever added:
  1. **Household creation must be atomic.** The very first
     `household_members` row (`role = 'owner'`) has to be inserted in the
     same transaction as the `households` row — one Postgres function
     exposed as an RPC, or one wrapped application transaction. Never a
     two-step "create the household, then separately add an owner" flow,
     which could be interrupted halfway and leave a real, persisted,
     ownerless household.
  2. **Every future action that touches the current owner's role or
     status** (reassigning ownership, archiving the owner, an owner
     demoting themselves) has to guarantee a replacement owner first.
     None of that logic exists yet — no RLS, no role-change endpoints —
     so this is a requirement placed on whoever builds it next, not
     something silently assumed to already be handled.

### RLS: enabled, zero policies, by design

All three tables get `ENABLE ROW LEVEL SECURITY` in this same migration —
not deferred to Migration 3 alongside the actual policies. With RLS on
and no policies defined, Postgres denies every row to the `anon` and
`authenticated` roles for every operation: true deny-by-default. The
alternative — leaving RLS off until Migration 3, or worse, adding a
temporary permissive policy "just for now" — would mean this project's
very first migration creates a window where household data is
world-readable through the API the instant it exists. That window is
avoided entirely by enabling RLS in the same statement that creates each
table. (The `service_role` key still bypasses RLS, as it always does by
Supabase design — that's the deployment-hygiene concern from §11's threat
table, unrelated to and unaffected by this table's RLS state.)

### `updated_at` strategy: one small reusable trigger

Decided in favor of a trigger, not deferred manual management.
`public.set_updated_at()` is a single generic `BEFORE UPDATE` function —
`new.updated_at = now(); return new;` — attached to all three tables. This
is standard, single-row, deterministic Postgres boilerplate, a
fundamentally different complexity class from the owner invariant's
cross-row problem above; it isn't the "unnecessary machinery" that
instruction was warning against. Without it, `updated_at` would silently
equal `created_at` forever unless every single UPDATE statement
everywhere remembered to set it by hand — a guaranteed eventual bug.

### Validation performed locally

- `npx supabase init` — no prior `supabase/` directory existed; this
  created `supabase/config.toml` and `supabase/.gitignore` (which already
  correctly excludes `.branches`/`.temp`/local env files).
- `npx supabase migration new ...` — used the CLI's own timestamp-based
  naming rather than hand-picking a filename.
- The project was **not** linked to `grocerymate-dev` at any point.
- A local Supabase stack (`supabase start`, Dockerized Postgres + Auth +
  the rest of the stack) was started and the migration applied to it via
  `supabase db reset`, then re-inspected directly (table/column/
  constraint/index existence, RLS state, the partial unique indexes, the
  trigger) to confirm the SQL is not just syntactically valid but
  behaves as designed — entirely local, never touching the remote
  project. See the final report for the exact outcome.
