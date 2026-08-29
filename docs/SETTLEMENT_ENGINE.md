# The Settlement Engine

This document explains GroceryMate's financial calculation engine: how it
represents money, how it splits a grocery bill fairly, how it decides who
owes whom, and the guarantees it makes. It's written to also work as
interview prep — if you can walk through this document from memory, you
can explain the architecture confidently.

**Where the code lives:**
- `src/domain/` — the shared data shapes (`Money`, `Member`, `GroceryItem`, `Settlement`, ...). Plain types, no logic.
- `src/engine/` — the calculation itself (`splitEvenly`, `calculateMemberBalances`, `minimizeTransactions`, `settlementEngine`).

**Status:** this engine is fully implemented and tested, but **not wired into the UI yet**. The Groceries/Members/Settlements pages you see today still run on hand-written mock data. Connecting the two is a deliberately separate, later step (see "Design questions before UI integration" at the end).

---

## 1. Why not just use JavaScript numbers for money?

`0.1 + 0.2` in JavaScript is `0.30000000000000004`, not `0.3`. That's not a
JavaScript bug — it's how binary floating-point numbers work, and every
mainstream programming language has the same issue. For a calculator app
this rounding error is invisible. For a *money* app, adding up enough
grocery prices this way will eventually put a household's balances off by
a paisa (or more), and nobody can see why.

The fix used throughout this engine: **never do money math in fractional
Taka. Do it in whole integers, one step smaller than the smallest unit
that matters.**

### Minor units

BDT's smallest everyday unit is the paisa: ৳1 = 100 paisa. The engine
represents every amount as an integer count of paisa ("minor units"),
never as a decimal number of Taka ("major units"):

| Taka (major units) | Minor units (paisa) |
|---|---|
| ৳100 | `10000` |
| ৳100.50 | `10050` |
| ৳0.01 | `1` |
| ৳999,999.99 | `99999999` |

Integers don't have a floating-point rounding problem — `10050 + 1` is
always exactly `10051`, forever. This is the same technique real payment
systems (Stripe, for example) use internally.

### The `Money` type

```ts
// src/domain/Money.ts
export interface Money {
  readonly minorUnits: number   // integer, never negative
  readonly currency: Currency   // which currency this amount is in
}
```

`Money` is deliberately a "dumb" data shape — it stores an amount and a
currency, and does *nothing else*. It has no `.add()`, no `.format()`, no
conversion helpers. That's on purpose, and it maps onto a rule worth
remembering:

> **Formatting belongs in the display layer. Calculation belongs in the
> domain layer. A shared data type shouldn't secretly own either.**

The existing `src/utils/money.ts` (`formatTaka`, `formatAmount`) is the
*display* layer — it turns a number into a string like `"৳100.50"` for the
UI, and never the other way around. This engine is the *domain* layer — it
takes `Money` values in and produces more `Money`-shaped numbers out, and
never touches a string. Neither layer does the other's job.

---

## 2. What goes into the engine

The engine's inputs are plain data — no React, no AI provider, no
Supabase client, nothing that would tie it to the current frontend or a
future backend:

```ts
// A person in the household
interface Member {
  id: MemberId          // e.g. "member-1" — a branded string, not just `string`
  name: string
  email: string
  role: 'owner' | 'member'
  // ...membership status
}

// One purchase
interface GroceryItem {
  id: GroceryItemId
  name: string
  unitPrice: Money              // integer minor units + currency
  quantity: number               // positive integer
  paidByMemberId: MemberId       // who paid
  sharedByMemberIds: MemberId[]  // who is splitting the cost
  // ...category, notes, timestamp
}
```

Two design choices worth calling out:

- **Members are identified by a stable `id`, not by display name.** The
  current mock UI actually keys people by name (`paidBy: 'Aisha Khan'`) —
  fine for a demo, but fragile in general (two members could share a
  name; a display name can be edited). The engine deliberately doesn't
  repeat that shortcut. Bridging name-keyed mock UI state to id-keyed
  engine input is exactly the kind of adapter work UI integration will
  need — see the design questions at the end.
- **`Brand<string, 'MemberId'>` types.** `MemberId` and `GroceryItemId`
  are both "just strings" at runtime, but the type system won't let you
  pass a `GroceryItemId` where a `MemberId` is expected. This catches a
  whole category of "which id was this again?" bugs at compile time for
  free.

## 3. What should *not* live in this layer

Part of designing this cleanly is being explicit about what the financial
domain layer is **not** responsible for. This codebase already has
several other domain-ish folders under `src/`, each solving a genuinely
different problem:

| Folder | What it's for | Why it's separate from the settlement engine |
|---|---|---|
| `src/ai/` | Calling an AI provider (Claude/OpenAI/Gemini) to parse a grocery list from a prompt or receipt | Produces *candidate* `GroceryItem`-shaped data; never computes balances or transfers itself |
| `src/ocr/` | Reading text off a photographed receipt | Text extraction only, no money math |
| `src/receiptPipeline/` | Orchestrates OCR → AI parsing → user confirmation | A pipeline that *feeds* the engine; doesn't replace it |
| `src/fairness/` | Turns an already-computed `SettlementResult` into a plain-language explanation ("Rahim owes ৳420 because...") | Explicitly reads the engine's output and is forbidden from recalculating anything — see its own `ARCHITECTURE.md` |
| `src/persistence/` | Saving/loading data (currently browser storage) | Storage concern; the engine takes plain arrays in memory and has no idea where they came from or where they'll be saved |

The through-line: **the settlement engine only ever computes a result from
the members and groceries it's handed. It never fetches data, never
calls an AI, never knows about React, and never persists anything.** Every
one of those concerns is a caller's responsibility, layered on top.

---

## 4. Splitting one item: `splitEvenly`

Given an item's total cost in minor units and the list of people sharing
it, `splitEvenly` divides the cost as evenly as integer math allows:

```
splitEvenly(totalMinorUnits, participantIds) → Map<MemberId, minorUnits>
```

The algorithm:

1. Integer-divide: `baseShare = Math.floor(total / count)`. Every
   participant gets at least this much.
2. Whatever's left over — `remainder = total - baseShare * count`, always
   between `0` and `count - 1` — can't be split any further as whole
   minor units. It has to go to *someone*.
3. **The rounding rule:** sort the participant ids alphabetically. The
   first `remainder` people in that sorted order each get one extra minor
   unit.

### Worked example

৳10.00 (1000 paisa) shared by 3 people, ids `alice`, `bob`, `carol`:

- `baseShare = Math.floor(1000 / 3) = 333`
- `remainder = 1000 - 333×3 = 1`
- Sorted order: `alice, bob, carol`. The first `1` of them — `alice` —
  gets the extra paisa.
- Result: **alice 334, bob 333, carol 333.** Sum: exactly 1000.

### Why sort by id, specifically

The rule has to be *deterministic* — the same inputs must always produce
the same split, regardless of what order the caller happened to list
people in. Sorting by id is simple, has no dependency on system time or
random numbers, and doesn't play favorites in any way a household would
notice or dispute (it's not "whoever's oldest" or "whoever paid" — just
alphabetical). Any fixed, order-independent tiebreaker would satisfy the
same requirement; this is the one this codebase picked.

### The one guarantee that matters most

However the remainder is distributed, **the shares always sum to exactly
the original total.** No minor unit is ever invented or dropped. This is
tested directly (`splitEvenly.test.ts`) by trying many different totals
and participant counts and checking the sum every time — including the
zero-participant-remainder case (evenly divisible) and the
one-participant case (nothing to split).

---

## 5. Per-member balances: `calculateMemberBalances`

This is the step that turns a household's entire grocery log into one
summary row per person:

```ts
interface MemberSettlementSummary {
  memberId: MemberId
  spentMinorUnits: number       // total this member paid, across all items
  consumedMinorUnits: number    // this member's fair share of everything, across all items
  netBalanceMinorUnits: number  // spentMinorUnits - consumedMinorUnits
}
```

For every grocery item, in order:

1. **Validate it** (see §7 below — an invalid item stops the whole
   calculation rather than silently producing a wrong number for
   everyone).
2. **Credit the payer.** Whoever's `paidByMemberId` is on the item gets
   the item's full cost (`unitPrice.minorUnits × quantity`) added to
   their `spentMinorUnits`. It doesn't matter whether they're one of the
   people sharing it.
3. **Charge the sharers.** `splitEvenly` divides that same cost among
   everyone in `sharedByMemberIds`, and each person's share is added to
   their `consumedMinorUnits`.

Every member in the household appears in the result exactly once — even
someone who never paid for or shared in anything gets a row of all
zeros, sorted by id so the result is always in the same order regardless
of what order members were listed in.

### Reading `netBalanceMinorUnits`

```
netBalance = spent - consumed
```

- **Positive** → this member covered more than their fair share. The
  household owes *them* money.
- **Negative** → this member consumed more than they covered. *They* owe
  the household money.
- **Zero** → settled up. This includes the common case of a purely
  personal item: someone buys a snack only for themselves, so their
  `spent` and `consumed` for that item are identical and cancel out —
  the item has no effect on anyone else's balance either.

### Why spent/consumed live on the same type

Reporting only the net number would hide the two things a member
actually wants to see on a statement: how much they paid in, and how
much their own consumption cost. Keeping both alongside the net is what
lets a future UI show "You paid ৳2,140 and your share was ৳1,850 — you're
owed ৳290" instead of just a bare number.

---

## 6. From balances to payments: `minimizeTransactions`

Knowing everyone's net balance isn't the same as knowing who should
actually pay whom. Five people with balances `+200, +100, -150, -100, -50`
could be settled by many different sequences of payments — the job here
is to pick a small, deterministic, *correct* one.

**Correctness comes first.** Before computing anything, the function
checks that every balance sums to exactly zero (see §7 — if it doesn't,
that's an internal bug, not something to paper over). Members who are
already at zero are dropped immediately; they need no transfer at all.

**Then it minimizes the transfer count, but doesn't chase perfection at
any cost:**

- **8 or fewer people with a non-zero balance:** the engine searches
  every possible way to pair debtors against creditors and keeps
  whichever sequence produces the fewest transfers. This is guaranteed
  to be the true mathematical minimum — for a household this size
  (which covers essentially every real GroceryMate household), an
  exhaustive search is still fast.
- **More than 8:** searching every combination becomes too slow, so the
  engine falls back to a simple greedy rule instead — repeatedly match
  whoever owes the most against whoever is owed the most, and repeat
  until everyone's at zero. This always finds *a* valid, small settling
  order (provably never more than one transfer per remaining person), just
  not always the mathematically smallest possible count for very large
  households. That trade-off is deliberate: a working, understandable
  greedy fallback beats an expensive search nobody asked for. ("Do not
  over-engineer optimization" was a real instruction behind this design.)

**Both paths are deterministic** — ties are always broken by sorting on
member id, so the exact same balances always produce the exact same list
of transfers, in the same order, no matter what order the members were
passed in.

### What a transfer looks like

```ts
interface DebtTransfer {
  from: MemberId          // who pays
  to: MemberId            // who receives
  amountMinorUnits: number // always a positive integer
}
```

Two things are true of every transfer this function can produce, by
construction rather than by an extra check bolted on afterward:

- **It never pays a member back to themselves** — a debtor and a
  creditor are, by definition, two different people with opposite-signed
  balances; a single person can't be both.
- **It's never for zero** — a transfer only exists to close out at least
  one side's remaining debt or credit, both of which are non-zero by the
  time a transfer is created.

---

## 7. Validation: what's an error vs. a valid edge case

Financial software has one job it can never compromise on: **never
silently repair or reinterpret data that changes what someone owes.** If
the input doesn't make sense, the engine throws a specific, typed error
instead of guessing.

| Situation | Outcome | Why |
|---|---|---|
| A grocery item's `paidByMemberId` isn't anyone in the members list (including an empty string) | `UnknownMemberError` | Guessing a payer would misattribute real money |
| A `sharedByMemberIds` entry isn't anyone in the members list | `UnknownMemberError` | Same reason, for the consuming side |
| `sharedByMemberIds` is empty | `EmptySharedByError` | A cost can't be divided among zero people — there's no "reasonable default" to fall back to |
| The same member appears twice in one item's `sharedByMemberIds` | `DuplicateSharedByError` | Silently deduplicating would quietly halve what looked like a double share; silently doubling their share would be worse |
| The same member id appears twice in the members list | `DuplicateMemberError` | Two entries claiming the same identity is a data problem the caller needs to fix, not something to merge automatically |
| `unitPrice.minorUnits` is negative, non-integer, `NaN`, or `Infinity` | `InvalidAmountError` | Any of these would poison every downstream sum |
| `quantity` is zero, negative, or non-integer | `InvalidAmountError` | Same reasoning |
| An item is priced in a different currency than the settlement is being computed in | `MixedCurrencyError` | ৳100 and $100 can't be added — there is no such thing as an "amount" without a currency attached |
| The engine's own computed balances don't sum to zero (only possible from a bug, not bad input) | `UnbalancedInputError` | An internal consistency check, not user-facing validation — if this ever fires, it means `calculateMemberBalances` itself has a bug |

Every one of these is a **subclass of `SettlementEngineError`**, so a
caller can catch just this family of errors without also swallowing
unrelated bugs.

**Valid edge cases — explicitly not errors:**

- **A brand-new household with no members and no groceries yet.**
  Returns an empty result (`memberBalances: []`, `transfers: []`), not an
  error — there's simply nothing to report.
- **A member with no grocery activity at all.** They still appear in the
  result, with every field at zero — they're not "invalid," just
  inactive so far.
- **A single-member household.** Trivially always settled — one person
  can't owe themselves anything.
- **A ৳0 item.** Splits into all-zero shares. Unusual, but not wrong.

The dividing line: if the *shape* of the data doesn't make financial
sense (an item that six people apparently paid for, a payer nobody's
heard of), that's an error. If the data is well-formed but simply
describes a quiet corner of ordinary life (nobody's added groceries
yet), that's a valid result.

---

## 8. The invariants — what must always be true

These are the properties every test in `src/engine/*.test.ts` (and
especially the generative test in `settlementEngine.property.test.ts`,
which checks them against 200 randomly-generated households rather than
just hand-picked examples) verifies, directly or indirectly:

1. **Every item's shares sum to exactly its total.** (`splitEvenly`'s own
   contract.)
2. **Total spent across the household = total consumed across the
   household = the true sum of every grocery item's cost**, computed
   independently from the raw input as a cross-check, not just compared
   against the engine's own intermediate numbers.
3. **All net balances sum to zero.** Money doesn't appear or vanish
   between "what was paid" and "what was owed."
4. **No settlement transfer ever pays a member back to themselves**, and
   **no transfer is ever for zero.**
5. **Applying every transfer exactly reconciles every member's net
   balance to zero** — sum up what a member pays out and receives
   across all transfers, and it always exactly cancels their starting
   balance.
6. **The same input always produces the same output** — no reliance on
   object iteration order, system time, or randomness anywhere in the
   calculation.
7. **Invalid input fails loudly, before producing a number, rather than
   quietly producing a plausible-looking wrong one.**

If any of these ever breaks, it's treated as a bug in the engine, not
something for a caller to work around.

---

## 9. Design questions to decide before UI integration

The engine itself is complete, but connecting it to the current mock UI
raises a few questions worth deciding deliberately rather than by
accident:

1. **Name-keyed UI state vs. id-keyed domain state.** The current mock UI
   identifies members and payers by display name (`paidBy: 'Aisha Khan'`).
   The engine identifies them by a stable `MemberId`. Wiring the two
   together needs a small adapter layer that maps the app's current
   members list to ids — worth deciding where that adapter lives (a
   thin mapping in the hook that currently owns grocery state, or a
   dedicated conversion module) rather than improvising it inline.
2. **Where does "parse what the user typed into an integer minor-unit
   amount" live?** The grocery entry form collects a decimal string
   (e.g. `"49.99"`); the engine wants an integer (`4999`). `Money`
   deliberately has no conversion helpers (see §1) — that responsibility
   needs an explicit home (a small, dedicated parser is the natural
   shape) rather than an inline `Math.round(parseFloat(x) * 100)`
   wherever it's next needed, which would quietly reopen the exact
   floating-point risk this whole design avoids.
3. **What currency does a household actually use?** The domain model
   already supports a `Currency` per household (and `MixedCurrencyError`
   if a grocery item disagrees with it) — today's UI has no currency
   picker at all; it's implicitly always BDT. Worth confirming BDT-only
   is fine for now versus exposing the picker that already exists at the
   type level.
4. **`minimizeTransactions`'s exact-solver limit (8 members).** Fine for
   every household this app currently models. Worth knowing this number
   exists before a much larger household (a big shared house, an office)
   is designed for.

None of these block using the engine as-is — they're integration
decisions, not correctness gaps.
