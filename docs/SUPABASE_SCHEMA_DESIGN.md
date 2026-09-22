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

| Domain type                 | What it models                                                                                                 | Schema relevance                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `Money`                     | `{ minorUnits: integer, currency: Currency }`                                                                  | Exactly how money should be stored — integer minor units, never a float |
| `Currency` / `CURRENCIES`   | `BDT\|USD\|EUR\|GBP\|INR`, each with `minorUnitDigits`                                                         | Currency is already a first-class concept, not hardcoded                |
| `Household`                 | `{ id, name, currency, memberIds, createdAt }`                                                                 | Maps almost directly to a `households` table                            |
| `Member`                    | `{ id, householdId, name, email, role } & (ActiveMember \| InvitedMember)`                                     | Maps to `household_members` — **missing an `Archived` variant**, see §4 |
| `GroceryItem`               | `{ id, householdId, name, category, unitPrice, quantity, paidByMemberId, sharedByMemberIds, addedAt, notes? }` | Maps to `grocery_items` + `grocery_item_consumers`                      |
| `Settlement` / `Payment`    | Debt + payoff record types                                                                                     | Already anticipates a payments concept (§8)                             |
| `HistorySession`            | Groups items+members into one shopping trip                                                                    | A real, well-modeled concept — **not persisted in MVP**, see §9         |
| `Receipt` / `AIParsedItem`  | Photo/pasted receipt → AI-extracted candidate items                                                            | AI-specific — **not part of this schema**, see below                    |
| `Brand<T, Name>` + `ids.ts` | Nominal-typed ids (`MemberId`, `GroceryItemId`, ...)                                                           | Directly reflects UUID primary keys, one per entity                     |

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

| Column         | Type          | Nullable                  | Notes                                              |
| -------------- | ------------- | ------------------------- | -------------------------------------------------- |
| `id`           | `uuid`        | not null, PK              | Same value as `auth.users.id` (1:1)                |
| `email`        | `text`        | not null                  | Mirrored from `auth.users` for convenient querying |
| `display_name` | `text`        | not null                  | What `Member.name` is today                        |
| `created_at`   | `timestamptz` | not null, default `now()` |                                                    |
| `updated_at`   | `timestamptz` | not null, default `now()` |                                                    |

- **PK:** `id` (shared with `auth.users`, not a separate surrogate key)
- **FK:** `id → auth.users(id)`, `ON DELETE CASCADE` (if a Supabase auth
  user is deleted, their profile goes with it — but see §11, this should
  be rare and deliberate)
- Populated by a trigger on `auth.users` insert (standard Supabase
  pattern) — **not implemented in this phase**, just planned for

### `households`

**Purpose:** one row per household — the unit everything else belongs to.

| Column          | Type          | Nullable                                  | Notes                                                              |
| --------------- | ------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `id`            | `uuid`        | not null, PK, default `gen_random_uuid()` |                                                                    |
| `name`          | `text`        | not null                                  | e.g. "Flat 4B"                                                     |
| `currency_code` | `text`        | not null, default `'BDT'`                 | CHECK against the same 5 codes as `CurrencyCode`                   |
| `created_by`    | `uuid`        | not null                                  | FK → `profiles(id)`. Provenance only — not "current owner," see §3 |
| `created_at`    | `timestamptz` | not null, default `now()`                 |                                                                    |
| `updated_at`    | `timestamptz` | not null, default `now()`                 |                                                                    |

- **PK:** `id`
- **FK:** `created_by → profiles(id)`, `ON DELETE RESTRICT` (a household
  should never lose its provenance record silently)
- No `owner_id` column — ownership is a **role** on `household_members`,
  not a household-level pointer (see §3 for why)

### `household_members`

**Purpose:** the most important table in this schema — a person's
participation in one household. See §3 for the full membership design;
this is the column reference.

| Column          | Type          | Nullable                                  | Notes                                                                                                      |
| --------------- | ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`            | `uuid`        | not null, PK, default `gen_random_uuid()` | This is `MemberId` — what `grocery_items`/`grocery_item_consumers` reference                               |
| `household_id`  | `uuid`        | not null                                  | FK → `households(id)`, `ON DELETE CASCADE`                                                                 |
| `profile_id`    | `uuid`        | **nullable**                              | FK → `profiles(id)`, `ON DELETE SET NULL`. Null = no account (invited-pending or permanently account-less) |
| `display_name`  | `text`        | not null                                  | The name shown/used regardless of account status — see §3                                                  |
| `invited_email` | `text`        | nullable                                  | Set only while `status = 'invited'`, used to resolve the invite to a real account later                    |
| `role`          | `text`        | not null, default `'member'`              | `'owner' \| 'member'`, CHECK-constrained                                                                   |
| `status`        | `text`        | not null, default `'active'`              | `'active' \| 'invited' \| 'archived'`, CHECK-constrained                                                   |
| `invited_at`    | `timestamptz` | nullable                                  | Set when `status` first becomes `'invited'`                                                                |
| `joined_at`     | `timestamptz` | nullable                                  | Set when `status` first becomes `'active'`                                                                 |
| `archived_at`   | `timestamptz` | nullable                                  | Set when `status` becomes `'archived'`                                                                     |
| `created_at`    | `timestamptz` | not null, default `now()`                 |                                                                                                            |
| `updated_at`    | `timestamptz` | not null, default `now()`                 |                                                                                                            |

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

| Column              | Type          | Nullable                                  | Notes                                                                                   |
| ------------------- | ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `id`                | `uuid`        | not null, PK, default `gen_random_uuid()` |                                                                                         |
| `household_id`      | `uuid`        | not null                                  | FK → `households(id)`, `ON DELETE CASCADE`                                              |
| `name`              | `text`        | not null                                  |                                                                                         |
| `category`          | `text`        | not null, default `'pantry'`              | CHECK against the 6 `GROCERY_CATEGORIES` values                                         |
| `amount_minor`      | `integer`     | not null, CHECK `> 0`                     | **Total** cost of this line — see §6 on why this isn't split into unit price × quantity |
| `quantity`          | `integer`     | not null, default `1`, CHECK `> 0`        | Informational only — display, not re-multiplied into `amount_minor`                     |
| `paid_by_member_id` | `uuid`        | not null                                  | Composite FK — see below                                                                |
| `notes`             | `text`        | nullable                                  |                                                                                         |
| `created_at`        | `timestamptz` | not null, default `now()`                 |                                                                                         |
| `updated_at`        | `timestamptz` | not null, default `now()`                 |                                                                                         |

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

| Column                | Type          | Nullable                  | Notes                                         |
| --------------------- | ------------- | ------------------------- | --------------------------------------------- |
| `grocery_item_id`     | `uuid`        | not null                  | FK → `grocery_items(id)`, `ON DELETE CASCADE` |
| `household_member_id` | `uuid`        | not null                  | Composite FK — see below                      |
| `household_id`        | `uuid`        | not null                  | Denormalized — see below                      |
| `created_at`          | `timestamptz` | not null, default `now()` |                                               |

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

| Case                           | `profile_id`                    | `status`   | `role`    | Notes                                                                                                                                                   |
| ------------------------------ | ------------------------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**                      | set (required by CHECK)         | `active`   | `owner`   | The person who created the household, or who's since been made owner                                                                                    |
| **Joined member**              | set                             | `active`   | `member`  | Has an account, has accepted                                                                                                                            |
| **Invited member**             | `NULL`                          | `invited`  | `member`  | `invited_email` set; becomes `active` + gets a `profile_id` the moment they sign up and accept — **same row**, so any future references stay valid      |
| **Non-account participant**    | `NULL`                          | `active`   | `member`  | Someone who shares costs but will never log in themselves (a housemate who doesn't want the app, a child, etc.) — `display_name` is their only identity |
| **Inactive / archived member** | unchanged from before archiving | `archived` | unchanged | See §4                                                                                                                                                  |

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

`integer` (max ~~2.1 billion) comfortably covers any realistic single
grocery line (~~৳21 million) with enormous headroom, and Postgres's
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
   defends against defensively) becomes something the _schema_ makes
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
payment is a historical _event_ — money that actually changed hands. It
cannot be recomputed from grocery data, because grocery data alone has no
way to know whether a suggested transfer was ever actually paid. This is
genuinely new source-of-truth information, which is exactly why §8
proposes a real table for it rather than a cached/derived field.

---

## 8. Payments / Mark Paid

**Design, not implement — this section describes the shape without
writing the reconciliation logic that would consume it.**

### The table: `payments`

| Column                   | Type          | Nullable                                  | Notes                                                                                                                                                                       |
| ------------------------ | ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | `uuid`        | not null, PK, default `gen_random_uuid()` |                                                                                                                                                                             |
| `household_id`           | `uuid`        | not null                                  | FK → `households(id)`, `ON DELETE CASCADE`                                                                                                                                  |
| `from_member_id`         | `uuid`        | not null                                  | Composite FK → `household_members(id, household_id)` — who paid                                                                                                             |
| `to_member_id`           | `uuid`        | not null                                  | Composite FK → `household_members(id, household_id)` — who received it                                                                                                      |
| `amount_minor`           | `integer`     | not null, CHECK `> 0`                     | No currency column — inherits `households.currency_code`, same reasoning as §6                                                                                              |
| `note`                   | `text`        | nullable                                  | Free-text context ("cash, Tuesday")                                                                                                                                         |
| `recorded_by_profile_id` | `uuid`        | nullable                                  | FK → `profiles(id)`. The **account** that entered this record — distinct from `from_member_id`/`to_member_id`, which are household members and may not have accounts at all |
| `created_at`             | `timestamptz` | not null, default `now()`                 |                                                                                                                                                                             |

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
if shipped naively — but it's a _display_ concern to solve later (e.g.,
grouping consecutive same-day items in the UI query, with no schema
change) rather than a reason to add a whole table now on a guess about
whether users will actually want explicit trip-grouping. Add
`shopping_sessions` later if and when real usage shows it's wanted.

---

## 10. Authorization model (RLS intent)

**Core invariant, restated:** a user must never read or modify another
household's data unless they're an authorized member of that household.
Everything below is policy _intent_ — the actual SQL is Migration 3
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
- **UPDATE status → archived:** owner-only for archiving _someone else_;
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

| Risk                                                                                  | Primary defense                                                                                                                                                                            | Layer(s)                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guessing/enumerating household ids                                                    | Non-sequential `uuid` PKs (defense in depth) + RLS SELECT scoping                                                                                                                          | Schema + RLS                                                                                                                                                     |
| Changing a `grocery_items.household_id` to move it into another household             | RLS `UPDATE ... WITH CHECK` re-validates the new `household_id`; consider disallowing `UPDATE` of this column entirely via a trigger                                                       | RLS + application (+ optional trigger)                                                                                                                           |
| A payer id belonging to another household attached to a grocery                       | **Composite FK** `(paid_by_member_id, household_id) REFERENCES household_members(id, household_id)` — structurally impossible, not just checked                                            | **Schema** (primary), RLS `WITH CHECK` (redundant insurance)                                                                                                     |
| Same, for consumers                                                                   | Same composite-FK pattern on `grocery_item_consumers`, using its denormalized `household_id`                                                                                               | **Schema** (primary)                                                                                                                                             |
| Duplicate consumer records (same member listed twice on one item)                     | Composite PK `(grocery_item_id, household_member_id)`                                                                                                                                      | **Schema** — cannot happen                                                                                                                                       |
| Deleted/archived member references going stale                                        | `ON DELETE RESTRICT` makes hard-delete-while-referenced impossible; archived rows are simply excluded from _new_-selection queries, never from historical resolution                       | **Schema** (integrity) + application (selection filtering)                                                                                                       |
| Unauthorized household membership changes (adding/removing someone else's membership) | Owner-only (or active-member, per §14's open question) INSERT/UPDATE policies                                                                                                              | RLS                                                                                                                                                              |
| Service-role key exposed to the frontend                                              | Never referenced by any `VITE_`-prefixed env var or shipped in a client bundle; only used server-side (Edge Functions / trusted server context); all frontend calls use the anon key + RLS | **Application/deployment discipline** — RLS is irrelevant here, since the service-role key bypasses RLS by design. This is a process rule, not a database design |

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
  principle §4 already applies to members. _Not_ resolved: whether a
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
  to _claim_ the invariant is solved. **It is not implemented.**

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

---

## 16. Migration 2 implementation notes

Covers `supabase/migrations/20260901154022_grocery_items_and_consumers.sql` —
`grocery_items`, `grocery_item_consumers` only, prepared and validated
locally. Migration 1 is untouched. Not applied to `grocerymate-dev` yet.

### Tables

`grocery_items`: `id`, `household_id`, `name`, `category`, `amount_minor`,
`quantity`, `paid_by_member_id`, `created_by_member_id`, `notes`,
`created_at`, `updated_at`. `grocery_item_consumers`: `grocery_item_id`,
`household_member_id`, `household_id` (denormalized), `created_at`. Full
column reference already in §2/§12 above; what follows is what changed or
sharpened during actual implementation.

### `created_by_member_id` — §14's open question #4, now resolved

Added, matching `paid_by_member_id`'s exact treatment: not-null, its own
composite FK to `household_members(id, household_id)`. Independent of
`paid_by_member_id` by design — a member can log a grocery someone else
paid for (the common "I noticed we're out of rice, Bilal actually paid"
case), so nothing forces the two columns to match, and nothing should.
Both are validated against the same household independently; there is no
rule requiring creator and payer to be the same person, nor a rule
requiring them to differ.

### Cross-household integrity: two composite FKs per row, not one

Every financial reference uses `(member_id, household_id) REFERENCES
household_members(id, household_id)` — the pattern Migration 1
established. `grocery_items` uses it twice (once for `paid_by_member_id`,
once for `created_by_member_id`). Migration 1's supporting constraint
(`household_members_id_household_id_key`, `UNIQUE (id, household_id)`)
was confirmed to already exist before writing a single line of this
migration — it is what makes composite FKs against `household_members`
possible at all.

One real strengthening beyond the original §2 sketch:
`grocery_item_consumers` needs two composite FKs, not one, to fully
close the cross-household gap:

1. `(household_member_id, household_id) → household_members(id, household_id)` —
   confirms the referenced member is real and genuinely belongs to the
   claimed household.
2. `(grocery_item_id, household_id) → grocery_items(id, household_id)` —
   confirms the referenced grocery item is real, and that this row's
   claimed household_id matches that item's actual household.

The original §2 sketch only had a plain `grocery_item_id → grocery_items(id)`
FK. That alone would still have let someone attach a real item from
Household A to a consumer row claiming Household B's household_id — as
long as the household_member_id really did belong to Household B, the
single member-side FK would have been satisfied while the row silently
lied about which household the item belonged to. Requiring `grocery_items`
to also expose `(id, household_id)` as a unique target
(`grocery_items_id_household_id_key`) closes this — a plain single-column
`grocery_item_id` FK became unnecessary once the composite FK existed,
since the composite target already guarantees `grocery_item_id` is a real
row (it is part of a unique pair that includes the primary key). Verified
directly: a consumer row with a real Household-B member correctly
attached to a real Household-A item, but claiming Household B as the
household_id, is rejected — by the item-side composite FK specifically,
distinct from (and in addition to) the member-side one.

### Delete/archive behavior

- Deleting a grocery item removes its consumer rows —
  `grocery_item_consumers`'s composite FK to `grocery_items` is ON DELETE
  CASCADE. Consumer rows have no independent meaning once the item they
  describe is gone.
- Archiving a member never touches grocery data at all — archiving is a
  plain UPDATE (`status`, `archived_at`), which does not fire any FK
  action in either direction. Verified directly: archiving a member who
  is both a grocery's creator and a consumer elsewhere leaves every
  reference fully intact and resolvable, exactly as before.
- Hard-deleting a referenced member remains blocked — no ON DELETE clause
  is written on either `grocery_items`' member-composite FKs or
  `grocery_item_consumers`' member-composite FK, so Postgres's default
  (NO ACTION) applies: a household_members row cannot be deleted while
  anything in Migration 2 still points to it, as payer, creator, or
  consumer. Verified directly — including the specific case of an
  already-archived member who is still referenced: archiving does not
  weaken this protection at all; the row remains equally undeletable
  before and after archival.
- Inherited limitation from Migration 1, explained rather than papered
  over: `household_members.household_id → households(id)` is ON DELETE
  CASCADE (Migration 1, unchanged here). MVP has no product action that
  deletes a household — but if a `households` row were ever deleted
  directly (bypassing the application, e.g. by direct SQL), that cascade
  would delete every member of that household, which would in turn
  cascade through this migration's `grocery_items`/`grocery_item_consumers`
  FKs, silently destroying the household's entire financial history. This
  is not something Migration 2 introduces or can fix without changing
  Migration 1's already-applied `households` FK (explicitly out of scope
  this task). It sharpens §14's open question #5 ("should households be
  archivable like members") from a hypothetical into a concrete
  consequence: if household deletion ever becomes a real product action,
  Migration 1's household-level CASCADE needs revisiting first —
  archiving a household, mirroring member archival, is the likely answer,
  not a real DELETE.

### Money

No `currency_code` column on `grocery_items` — inherits the household's,
same reasoning as §6. `amount_minor` is `integer`, the line's
already-final total (not unit_price × quantity — §5's existing decision,
unchanged).

One correction against the engine's actual behavior, reported rather than
silently applied: §12's reference schema showed `CHECK (amount_minor > 0)`.
The settlement engine's own validation (`calculateMemberBalances.ts`)
only rejects `unitPrice.minorUnits < 0` — it explicitly allows zero
(`splitEvenly` has a dedicated, passing test for a zero-cost item
splitting into all-zero shares; §8's "what held up well" table already
called a ৳0 item "unusual, but not wrong"). Migration 2 implements CHECK
(amount_minor >= 0) — matching the engine, not the earlier sketch. A
stricter-than-the-engine constraint here would reject data the
application layer considers entirely valid; verified directly that a
zero-amount item is accepted and a negative one is rejected.

### Indexes

Two on `grocery_items`, one on `grocery_item_consumers` — not one per
column named in the prompt, because several would have been redundant:

- `(household_id, created_at DESC)` replaces a plain household_id index
  rather than sitting alongside one: every realistic query is "this
  household's groceries, newest first," needing the filter and the sort
  together — a composite index serves both; a household_id-only index
  would only ever serve the filter half.
- `paid_by_member_id` alone — a member's total paid is a real, frequent
  lookup (it is what the engine's spentMinorUnits is built from).
- No index on `created_by_member_id`: nothing in the current product
  queries "everything I logged" — §14's open question #2 already
  established that edit/delete is not even restricted to the logger. The
  column exists for completeness, not because a lookup pattern needs it.
- `grocery_item_consumers.household_member_id` alone — the composite
  primary key (grocery_item_id, household_member_id) already makes "find
  this item's consumers" efficient (leading column), but not "find
  everything this member consumes" (trailing column) — which is exactly
  what reconstructing a member's consumedMinorUnits needs (see below).
- No index on `grocery_item_consumers.household_id`: nothing queries this
  table by that column directly; every real access path goes through
  grocery_item_id or household_member_id, both already covered.

### `updated_at`

Reuses Migration 1's `set_updated_at()` — no second trigger function
defined. Attached to `grocery_items` only. `grocery_item_consumers` gets
no `updated_at` at all: a consumer relationship is added or removed,
never edited in place, so there is nothing for the column to track.
Verified the trigger fires correctly (two separate transactions, since
now() is fixed for the life of one transaction — the same methodology
note from Migration 1's own validation).

### RLS

Enabled on both tables in this same migration, zero policies — identical
reasoning to Migration 1: no window where grocery data exists but is
unprotected, and Migration 3 is still where policies belong.

### Engine reconstruction

Using the Rice/Chicken/Aisha-Bilal-Chloe scenario already used elsewhere
in this project's manual verification: persisted rows alone (grocery
amount_minor, paid_by_member_id, and grocery_item_consumers rows)
reconstruct into exactly computeSettlement's expected shape — member
ids, an amount, a payer id, and a list of consumer ids, with quantity
fixed at 1 (since amount_minor is already the final total, feeding the
stored decorative quantity back into the engine would double-count it).
No display name, mock constant, derived balance, or stored settlement
suggestion appears anywhere in the reconstruction query.

## 17. Migration 3 — Authorization / RLS

`20260903123149_authorization_rls.sql`. Adds policies, grants, and helper
functions to the five tables Migrations 1-2 already created with RLS
enabled and zero policies (deny-by-default since the moment each table
existed). No new tables, no changes to Migrations 1 or 2, no Auth
implementation, no payments, no service-role logic. Applied and fully
tested locally only — not applied to the linked remote project.

### Core invariant

A user must never read or modify another household's data unless
authorized through their own household membership. Every policy derives
authorization from `auth.uid()` — the JWT-verified identity Postgres
itself trusts — never from a client-supplied `household_id`, `profile_id`,
or display name.

### Authorization helpers (`private` schema)

`private` is a new, non-exposed schema (not in `supabase/config.toml`'s
`api.schemas`, so never callable via `supabase.rpc(...)` — only from
inside a policy, which executes in Postgres itself). Four `SECURITY
DEFINER` functions live there:

- `is_household_member(household_id, include_archived default false)` —
  is `auth.uid()` a member of this household (optionally including
  archived, for historical read access)?
- `is_household_owner(household_id)` — is `auth.uid()` the _active_ owner?
- `household_member_id_for(household_id)` — `auth.uid()`'s own
  `household_members.id` row in this household, if active; null
  otherwise. This is what a grocery-creation policy checks a client's
  claimed `created_by_member_id` against — derived server-side, never
  trusted from the request body.
- `can_edit_grocery_item(grocery_item_id)` — is `auth.uid()` that item's
  creator, or the household's active owner?

All four: `language sql stable security definer set search_path = ''`,
fully-qualified table references, owned by `postgres`, `revoke execute ...
from public, anon; grant execute ... to authenticated`. `SECURITY DEFINER`
is required, not incidental: `household_members`' own SELECT policy calls
`is_household_member`, so a `SECURITY INVOKER` version would re-trigger
that same policy inside itself — infinite recursion. Table owners are
exempt from a table's own RLS by default (no table here sets `FORCE ROW
LEVEL SECURITY`), so a function owned by `postgres` breaks the cycle: the
query inside the function runs unfiltered, and only the function's own
boolean return value feeds the caller's policy. This cannot be abused
despite the elevated privilege — the `household_id` argument is
caller-suppliable and that's harmless (it returns a bare boolean, never
row data); _whose_ membership is checked always comes from `auth.uid()`,
never from an argument.

Recursion was verified empirically, not just reasoned about: a standalone
test (`SELECT ... FROM household_members` and `SELECT ... FROM households`
as the household's own owner, simulating `auth.uid()` via
`request.jwt.claim.sub`) ran with no "infinite recursion detected in
policy" error.

### GRANT matrix

A critical fact discovered while testing (see "Security issue discovered"
below): Supabase provisions every project with `ALTER DEFAULT PRIVILEGES`
on the `public` schema that grants `anon`/`authenticated`/`service_role`
full `arwdDxtm` (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER)
on every table as it's created, independent of anything Migrations 1-2
wrote. Every table block in this migration now opens with `revoke all on
public.<table> from authenticated;` before granting anything back, so the
GRANTs below are authenticated's _complete_ and _only_ privilege — not
additive on top of a hidden platform default.

| Table                    | SELECT | INSERT (columns)                                                                                       | UPDATE (columns)                                                   | DELETE |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------ |
| `profiles`               | ✓      | —                                                                                                      | `display_name`                                                     | —      |
| `households`             | ✓      | — (RPC only)                                                                                           | `name, currency_code, status, archived_at`                         | —      |
| `household_members`      | ✓      | `household_id, profile_id, display_name, invited_email, role, status, invited_at, joined_at`           | `role, status, display_name, invited_at, joined_at, archived_at`   | —      |
| `grocery_items`          | ✓      | `household_id, name, category, amount_minor, quantity, paid_by_member_id, created_by_member_id, notes` | `name, category, amount_minor, quantity, paid_by_member_id, notes` | ✓      |
| `grocery_item_consumers` | ✓      | `grocery_item_id, household_member_id, household_id`                                                   | —                                                                  | ✓      |

`anon` is granted nothing at all on any of the five tables or on
`create_household` — asserted with an explicit `revoke all ... from anon`
block, confirmed empirically (every table and the RPC return "permission
denied" as `anon`). No `GRANT ALL` appears anywhere. GRANT and RLS are
deliberately layered, not redundant: GRANT is the coarse, table/column-level
gate ("can this role touch this column at all, ever") that Postgres checks
before RLS is even consulted; RLS is the fine-grained, per-row gate ("is
_this specific row_, for _this specific caller_, allowed"). Neither
subsumes the other — the security issue below is exactly a case where GRANT
alone had to do a job RLS structurally cannot.

### Policies per table

14 policies total, all scoped `to authenticated` (verified via
`pg_policies`):

- **profiles**: `profiles_select_own`, `profiles_update_own` — both
  `id = auth.uid()`.
- **households**: `households_select_member` (member, archived included),
  `households_update_owner` (active owner only). No INSERT/DELETE policy.
- **household_members**: `household_members_select_member` (member,
  archived included), `household_members_insert_owner` (active owner
  only — adding to an _existing_ household), `household_members_update_owner`
  (active owner only). No DELETE policy.
- **grocery_items**: `grocery_items_select_member` (member, archived
  included), `grocery_items_insert_active_member` (active member, and
  `created_by_member_id` must equal the caller's own derived member id),
  `grocery_items_update_creator_or_owner` / `grocery_items_delete_creator_or_owner`
  (creator or active owner, via `can_edit_grocery_item`).
- **grocery_item_consumers**: `grocery_item_consumers_select_member`
  (member, archived included), `grocery_item_consumers_insert_authorized_editor`
  / `grocery_item_consumers_delete_authorized_editor` (same creator-or-owner
  rule as the grocery itself). No UPDATE policy or grant — changing "who
  shares this item" is a delete-plus-insert, matching how the frontend's
  `MemberChipPicker` already replaces its whole selection rather than
  editing in place.

### Household creation strategy

No direct INSERT policy or grant exists on `households` at all. A new
household has no members yet, so no ordinary RLS-gated INSERT policy can
authorize creating its first (owner) row without also being loose enough
to let anyone insert _any_ household — the insecure shortcut this task
was explicitly designed to avoid. Instead, `public.create_household(p_name,
p_currency_code default 'BDT', p_display_name default null)` — a
`SECURITY DEFINER` function, `search_path = ''`, granted to `authenticated`
only — performs both inserts (household, then its owner membership row)
atomically in one implicit transaction, deriving the owner exclusively
from `auth.uid()`. The function's signature has no owner/profile
parameter at all, so there is no argument a caller could use to name a
different owner — verified by inspecting `pg_get_function_arguments`
directly, not just by reading the source. Tested end-to-end as an
authenticated user: exactly one household and exactly one
`owner`/`active` membership row resulted, both matching the RPC's
returned `household_id`/`owner_member_id`.

### Profile security

A user reads and updates only their own `profiles` row
(`id = auth.uid()`). Only `display_name` is grantable on UPDATE — `id` and
`email` are excluded from the column grant entirely (not merely blocked by
RLS), so a client cannot self-service either even on their own row.
Profile creation (INSERT) remains ungranted: the signup-time
profile-creation trigger was deliberately deferred in Migration 1 (Auth
isn't implemented yet), documented as an open item rather than worked
around here.

### Membership-management security

Only the active owner may add, invite, archive, or reactivate members
(`household_members_insert_owner` / `household_members_update_owner`).
No self-service carve-out exists: a member cannot promote themselves,
archive the owner, or archive themselves under these policies (self-removal
isn't in the approved permissions list — a named limitation, not an
oversight). `profile_id`, `household_id`, and `id` are excluded from the
UPDATE column grant, so even the owner cannot reassign an existing
member row to a different profile or move it to a different household.
Hard DELETE is denied entirely for MVP — archive is the only removal path
exposed to clients.

### Grocery creator protection

`grocery_items_insert_active_member`'s `WITH CHECK` requires
`created_by_member_id = private.household_member_id_for(household_id)` —
the caller's own membership id, derived server-side from `auth.uid()`,
never the value the client sent. A client claiming a different member's id
as creator fails this check outright. `household_id` and
`created_by_member_id` are excluded from the UPDATE column grant, so
neither the row's household nor its creator can be rewritten after the
fact — closing the gap described below, where RLS's `USING`/`WITH CHECK`
had no way to compare a column's OLD value against its NEW value in one
predicate. `paid_by_member_id` is deliberately unconstrained by policy;
Migration 2's composite FK already guarantees it names a real member of
the same household, and paying for someone else's logged item is normal.

### Consumer protection

Insert/delete on `grocery_item_consumers` both require
`can_edit_grocery_item(grocery_item_id)` — the same creator-or-owner rule
as editing the grocery itself, so adding or removing a consumer is treated
as part of editing the grocery, not a separately gated action. Even if a
caller supplied a mismatched `household_id`, Migration 2's composite FK
rejects it independent of RLS entirely.

### Archived-member behavior

Archived members retain read access to their former household, its
roster, and its groceries (`is_household_member(..., true)` everywhere a
SELECT policy needs it) — historical visibility survives archival. Every
write path (`is_household_member(..., false)` for grocery creation,
`can_edit_grocery_item` for edits) requires _active_ status, so an
archived member can read but never write again, including on grocery rows
they themselves created before being archived.

### Adversarial test results

A single-transaction test script (rolled back at the end, so nothing
persisted) simulated Users A/B/D + owner A in Household A and User C as
owner of Household B, then ran 34 checks: cross-household read denial in
both directions, roster read denial for outsiders, grocery creation
(success, creator-identity impersonation rejected, non-member rejected),
edit/delete authorization (creator succeeds, non-creator/non-owner is
silently a no-op, owner succeeds, creator deletes), archived-member
behavior (historical read survives; create/update/delete on an
already-archived member's own old row are silent no-ops), membership
management (non-owner member-add rejected, self-promotion rejected,
archiving the owner rejected, owner's add+reactivate succeed, owner
cannot reassign `profile_id` or `household_id` on an existing member
row), cross-household payer/consumer rejected by Migration 2's FKs,
consumer-add by a non-editor rejected, consumer-add by the actual creator
succeeds, profile isolation (cannot read another profile; an UPDATE
attempt against another user's row is a silent no-op), and finally the
GRANT-layer column-immutability checks: an authorized editor cannot
reassign `grocery_items.household_id` or `created_by_member_id`, a user
cannot change their own `profiles.email`, an owner cannot rewrite
`households.created_by`, and — the most severe of the set — `authenticated`
cannot `TRUNCATE` `household_members`. All 34 checks matched their
expected outcome. Two distinct denial shapes were exercised and confirmed
correct: a denied INSERT (or a GRANT-privilege violation on UPDATE/TRUNCATE)
raises a real Postgres error, caught via `SAVEPOINT`/`ROLLBACK TO
SAVEPOINT`; a denied UPDATE/DELETE under RLS's `USING` clause raises no
error at all — the row is simply invisible to the statement, so it silently
affects zero rows, verified via a follow-up `SELECT` of the row's actual
value rather than a caught exception.

### How `auth.uid()` was tested

`auth.uid()`'s real local definition (confirmed via
`pg_get_functiondef`) resolves from `request.jwt.claim.sub` (falling back
to a `request.jwt.claims` JSON blob). Every simulated user in every test
ran `select set_config('request.jwt.claim.sub', '<uuid>', true); set role
authenticated;` immediately before its statements, and `reset role;`
immediately after — never `SET ROLE authenticated` alone, since that only
selects which policies'/grants' `to` clause applies, not _which_
authenticated user is making the request. `anon` was tested separately
(no JWT claim, `set role anon;`), against a running database with real
tables, confirming "permission denied" on every table and the RPC. The
`create_household` RPC was tested with a fifth simulated user
(`request.jwt.claim.sub` set to a new uuid) in its own isolated
transaction.

### `db lint` result

`supabase db lint --local --schema public` → `No schema errors found`,
re-run clean after the GRANT-layer fix below.

### Security issue discovered while implementing

The original migration granted `UPDATE` on specific columns only (e.g.,
`grant update (name, category, ...) on grocery_items to authenticated`),
intending that to be the mechanism preventing `household_id` and
`created_by_member_id` from ever being rewritten — since RLS's
`USING`/`WITH CHECK` pair cannot compare a column's OLD value against its
NEW value in one predicate. This design was silently defeated:
Supabase's platform-level `ALTER DEFAULT PRIVILEGES` on the `public`
schema had already granted `authenticated` full table-wide `arwdDxtm`
(including `UPDATE` on every column, and — far more seriously —
`TRUNCATE`, which Postgres never subjects to RLS at all) on all five
tables, independent of anything either migration file wrote. A
column-level GRANT is purely additive; it cannot narrow a privilege the
role already holds table-wide. The practical effect, before the fix: an
authorized grocery editor could reassign `household_id` or
`created_by_member_id` after the fact, an owner could hijack an existing
`household_members` row by reassigning its `profile_id`, a user could
change their own `profiles.email` directly, and — the most severe —
_any_ authenticated user could `TRUNCATE` any of the five tables outright,
wiping every household's data, with RLS providing zero protection against
it. Confirmed the root cause directly via `pg_default_acl` and
`pg_class.relacl` (both showed the un-narrowed `authenticated=arwdDxtm`
entry, sourced from `postgres`'s and `supabase_admin`'s default ACLs, not
from any migration's own GRANT statement) before writing the fix. The fix:
every table block now opens with an explicit `revoke all on public.<table>
from authenticated;` before its GRANTs, so the column-level and table-level
grants that follow are authenticated's complete privilege set, not an
addition on top of a hidden default. Re-verified afterward via
`pg_class.relacl` (authenticated now shows only the intended privileges —
no `TRUNCATE`, `REFERENCES`, or `TRIGGER` on any table), re-ran the full
34-check adversarial matrix (all passing), and added four new checks
specifically targeting this class of bug (the two `grocery_items` column
reassignments, the `households.created_by` reassignment, and the
`household_members` `profile_id`/`household_id` reassignments) plus a
fifth proving `TRUNCATE` is now rejected.

### Remaining security blocker

None for the scope of this migration. Two items are documented as
deliberate, named limitations rather than gaps: self-removal from a
household (a member archiving themselves) is not implemented, since it
isn't in the approved permissions list; and invite-acceptance (linking an
invited `household_members` row's `profile_id` to a real profile at
signup) is deferred to a future dedicated function, the same shape as
`create_household()`, since it needs to verify the accepting user's
identity against the invite in a way a plain owner UPDATE grant cannot
safely express. Both are product-scope decisions, not authorization holes
in what this migration does implement.

## 18. Migration 4 — Auth Profile Lifecycle

`20260903143905_auth_profile_lifecycle.sql`. Resolves the open item named
in Migration 1's own comments and in this document's Migration 1 notes
(§15): "no profiles row is created automatically today." Adds exactly one
trigger and its function — no new tables, no changes to Migrations 1-3, no
RLS/GRANT changes anywhere, no frontend code. Applied and tested locally
only — not applied to the linked remote project.

### Signup lifecycle

`auth.users` gets an `AFTER INSERT ... FOR EACH ROW` trigger,
`on_auth_user_created`, firing `public.handle_new_user()`. It runs inside
GoTrue's own signup transaction: if it raises, the whole signup — the
`auth.users` insert included — rolls back, so there is no window where an
account exists with no profile. This is why the mechanism is a database
trigger and not frontend code calling a "create my profile" endpoint after
signup: a trigger has no network round-trip between "account created" and
"profile exists" for a client to crash or skip during, and it reads `NEW`
— the row Postgres itself just inserted — rather than trusting anything a
client claims about its own identity.

### Trigger / function

`public.handle_new_user()` — `language plpgsql`, `security definer`,
`set search_path = ''`, owned by `postgres`, fully-qualifies
`public.profiles`. `SECURITY DEFINER` is required, not incidental: the
trigger fires as `supabase_auth_admin` (GoTrue's own role), which has no
reason to hold `INSERT` on `public.profiles`; running as the function's
owner instead is what lets the insert succeed without granting that role
anything new. Body:

```sql
insert into public.profiles (id, email, display_name)
values (
  new.id,
  new.email,
  coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'New Member'
  )
)
on conflict (id) do nothing;
```

Never trusts a client-supplied profile id: `NEW.id` is `auth.users.id` for
the row that was just inserted, generated server-side by GoTrue — nothing
in the public signup API lets a client choose it, so there is no argument
anywhere in this design a caller could use to name a different id. Never
creates duplicate profiles: `ON CONFLICT (id) DO NOTHING` makes the insert
idempotent (defense in depth — normal signup only ever fires this once per
`auth.users` row, since `id` is that table's primary key). Fails safely:
no exception handling swallows errors — a `NOT NULL` violation on `email`
(the only plausible failure today, discussed below) propagates and rolls
back the entire signup rather than leaving an account with no profile.

Cannot be abused as a generic "create a profile for any uuid" RPC: it is a
trigger function (`returns trigger`), which Postgres refuses to invoke any
other way — confirmed empirically, calling it directly (even as its own
owner, `postgres`) raises `trigger functions can only be called as
triggers`. It also takes no arguments at all. `EXECUTE` is explicitly
revoked from `public`, `anon`, and `authenticated` as documented,
auditable intent on top of that language-level restriction; `service_role`
retains the platform's default `EXECUTE` grant on every `public`-schema
function, unchanged and out of scope, the same as `create_household()` in
Migration 3.

### Email strategy

`profiles.email` is a **signup-time snapshot**, not kept synchronized with
`auth.users.email` afterward. No second trigger reacts to `auth.users`
email changes. Reasoning: `auth.users` remains the sole authority for the
current, login-relevant email; `profiles.email` exists only for the
application's own display/lookup purposes, so a stale snapshot after an
email change is a minor, visible-and-fixable cosmetic gap, not a security
or correctness one — and this is the smallest reliable model, versus a
second trigger and its own failure modes for a case that doesn't affect
authorization at all. Documented here as a **named limitation**: if a user
changes their email through Auth, `profiles.email` will not follow until
something updates it (a future migration, or an application action using
the existing `profiles_update_own`-equivalent... except `email` is
deliberately not in that policy's grantable columns either — email
resynchronization, if ever needed, belongs to a dedicated, reviewed
mechanism, not a client-writable column).

Case handling: `auth.users`'s own uniqueness is a case-sensitive partial
unique index (`users_email_partial_key`, `where is_sso_user = false`) —
not a `lower(email)` unique index (a separate, non-unique
`users_instance_id_email_idx` on `lower(email)` exists only for
case-insensitive login lookup). This trigger copies `NEW.email` verbatim,
in whatever case GoTrue already stored it — consistent with the upstream
value, not a reinterpretation of it. `profiles.email`'s own unique index
(from Migration 1) is unaffected by this choice and remains defense in
depth, not the layer that actually prevents duplicate signups (GoTrue's
own signup check does that, confirmed empirically: a same-email signup
attempt is rejected by GoTrue itself with `422 user_already_exists` before
ever reaching this trigger).

Null email: this project's local config has `enable_anonymous_sign_ins =
false` and `auth.phone`'s `enable_signup = false`, so every reachable
signup path today produces a non-null `auth.users.email`. If either were
ever enabled without revisiting this migration, a resulting null-email
signup would violate `profiles.email`'s `NOT NULL` constraint and the
whole signup would fail closed — an explicit, deliberate choice (see
"Fails safely" above), not an oversight. Redesigning for other Auth
providers is out of scope for this MVP migration.

### Display name strategy

Reads only the `display_name` key out of `auth.users.raw_user_meta_data`
— never the metadata object wholesale, never any other key in it — trims
it, and treats empty/whitespace-only as absent. Falls back to the email's
local part, then to the fixed literal `'New Member'`, so signup can never
fail for lack of a display name. A user can change this immediately
afterward via Migration 3's existing `profiles_update_own` policy and its
`display_name`-only column grant — unchanged by this migration.

### User deletion behavior

Migration 1's `profiles.id references auth.users(id) on delete cascade`
combines with `household_members.profile_id references
public.profiles(id) on delete set null` (also Migration 1) to give: delete
an `auth.users` row → the matching `profiles` row is cascaded away → every
`household_members` row that pointed at it gets `profile_id` set to null,
but the row itself, its `display_name`, `role`, `status`, and — critically
— its `id` all survive unchanged. Every grocery reference
(`grocery_items.paid_by_member_id`/`created_by_member_id`,
`grocery_item_consumers.household_member_id`) points at
`household_members.id`, never at `profiles.id` directly (Migration 1's
foundational design choice, reaffirmed by Migration 2's composite FKs), so
none of them are touched at all by a profile's deletion. Verified
empirically, not just reasoned about: created a real Auth user, added her
as a household member, had her log a grocery and consume it herself,
deleted her Auth account via the real Admin API, and confirmed
afterward — `auth.users` row gone, `profiles` row gone, the
`household_members` row still present with `profile_id` null and
`display_name` still `'Carol the Member'`, and the `grocery_items` /
`grocery_item_consumers` rows completely unchanged, still referencing the
same `household_members.id`. No historical financial row broke. **No
change was made to this behavior** — testing proved it already correct,
exactly the instruction for this step.

**A real, proven blocker was found and is deliberately not fixed here**:
`households.created_by uuid not null references public.profiles (id) on
delete restrict` (Migration 1) means a user who has ever created _any_
household — which, through `create_household()`, is every user who has
ever used the create-household flow — can never have their Auth account
deleted while that household still exists, because the cascade
`auth.users → profiles` hits that `RESTRICT` and the entire deletion fails
(confirmed empirically: a real delete attempt against such a user returned
`23503 households_created_by_fkey ... Key is still referenced`, and left
both the auth user and profile completely intact — a clean failure, not a
partial one). Since there is also no supported way to delete a household
at all today (no DELETE grant or policy on `households`), this is
effectively permanent for as long as the product has no household-deletion
story. This is a `households`/household-lifecycle schema question, not an
Auth-lifecycle one — fixing it would mean deciding what should happen to a
household's provenance record when its creator's account goes away
(nullable `created_by`? a transfer step? hard deletion rules?), which is
out of scope for "Auth Profile Lifecycle" and out of bounds for this
migration's "do not modify existing migrations" constraint. Documented
here as the blocker it is, for a future dedicated migration to resolve —
not worked around or silently absorbed into this one.

### Interaction with household_member identity

Nothing above changes the fact established in Migrations 1-2:
`household_members` is GroceryMate's stable financial identity, and
`profiles` is a strictly optional, deletable account layer on top of it.
This migration's only job was making sure the account layer gets created
automatically and safely — it does not, and structurally cannot, weaken
the account-independence Migration 1 already built in.

### Backend golden flow (tested end-to-end, no React code)

Using the real local Supabase Auth API (`/auth/v1/signup`,
`/auth/v1/admin/users/{id}`) and real access tokens against PostgREST —
not direct SQL role simulation, per this step's own instruction to exercise
the Auth API where reliable:

1. Signed up a real user ("Alice") via `/auth/v1/signup` with
   `data.display_name` metadata → confirmed exactly one `profiles` row
   appeared automatically, `id` matching `auth.users.id`, `email` matching,
   `display_name` matching the supplied metadata, `updated_at` populated.
2. Authenticated as Alice (the real access token from signup) and called
   `create_household('Alice Golden Household')` via
   `/rest/v1/rpc/create_household` → exactly one household and one
   `owner`/`active` membership row resulted, `profile_id` equal to Alice's
   own id.
3. Alice read her own household and its roster through
   `/rest/v1/households` and `/rest/v1/household_members` — both returned
   correctly under Migration 3's unmodified RLS policies.

Signup → profile exists → authenticated session → `create_household` →
caller becomes household owner → caller can read their own household,
fully confirmed as a backend-only flow.

### Test results

- **Auth signup**: two additional real signups tested — one with no
  `display_name` metadata at all (fell back correctly to the email's local
  part, `'zztest-signup-bob'`), and a same-email repeat signup attempt
  (rejected by GoTrue itself, `422 user_already_exists`, before reaching
  this migration's trigger at all; no duplicate profile, no residue).
- **Own-profile RLS**: authenticated as Alice via her real token — could
  `SELECT` her own profile; a query for another user's `id` returned an
  empty array, not an error; `PATCH`ing her own `display_name` succeeded
  and `updated_at` advanced (Migration 1's existing trigger, untouched,
  still firing correctly); `PATCH`ing her own `email` was rejected with
  `42501 permission denied for table profiles` (a GRANT-layer error,
  Migration 3's column grant, unchanged); `PATCH`ing another user's
  `display_name` silently affected zero rows.
- **Cross-user isolation**: created a second real user ("Bob"), had him
  call `create_household` for his own household, then confirmed — as Bob
  and as Alice, via their own real tokens — each could see only their own
  profile, only their own household, and only their own roster. Reused
  Migration 3's existing policies unchanged; no new policy was written or
  needed.
- **Historical reference preservation**: see "User deletion behavior"
  above — verified with a real created-then-deleted Auth account.
- **Migration 3 regression**: RLS remained enabled on all five tables,
  policy count remained exactly 14, `anon`'s table-grant count remained
  zero, and `authenticated`'s raw ACL was byte-for-byte identical to the
  post-Migration-3 state (`r` only on `profiles`/`households`/
  `household_members`, `rd` on `grocery_items`/`grocery_item_consumers` —
  no `TRUNCATE`, no table-wide `UPDATE`) — all re-checked after this
  migration, all unchanged.
- **`db lint --local`**: `No schema errors found`.
- **Residue**: all test auth users, profiles, households, memberships,
  and groceries created during this phase's testing were deleted
  afterward; a final count across all six tables (`auth.users` plus the
  five application tables) returned to zero.

### Known limitations

- **`profiles.email` is a signup snapshot, not synchronized** — see
  "Email strategy" above.
- **Null-email signups fail closed** — no anonymous or phone auth support
  in this trigger; both are disabled in this project's config today, and
  extending this migration for them is explicitly out of MVP scope.
- **A household's creator can never have their Auth account deleted while
  that household exists** — the proven blocker described in "User deletion
  behavior" above. Flagged for a future, dedicated household-lifecycle
  migration; not fixed here.
- **Invite-acceptance linking** (an invited `household_members` row's
  `profile_id` being attached to a real profile at signup) remains the
  named, deferred item from Migration 3 — this migration does not touch
  it; `handle_new_user()` only ever creates the new profile row itself,
  never modifies `household_members`.
