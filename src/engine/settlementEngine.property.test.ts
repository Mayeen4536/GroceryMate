import { describe, expect, it } from 'vitest'
import { GROCERY_CATEGORIES } from '@/domain/GroceryItem'
import type { MemberId } from '@/domain/ids'
import { computeSettlement } from './settlementEngine'
import { TEST_CURRENCY, makeGroceryItem, makeMember, summarizeTransfers } from './testHelpers'

/**
 * Generative ("property-style") coverage: instead of hand-picking example
 * households, this generates many pseudo-random ones and checks that the
 * engine's core financial invariants — the ones that must hold for *any*
 * valid input, not just the specific examples in the other test files —
 * hold for every single one. No new test-framework dependency; just a
 * small seeded, deterministic PRNG (mulberry32), so a failure always
 * reproduces from its printed seed instead of flaking between runs.
 */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface RandomHousehold {
  readonly memberIds: readonly MemberId[]
  readonly groceries: ReturnType<typeof makeGroceryItem>[]
}

function generateRandomHousehold(rng: () => number): RandomHousehold {
  const memberCount = 1 + Math.floor(rng() * 9) // 1..9 members
  const memberIds = Array.from({ length: memberCount }, (_, i) => `member-${i}` as MemberId)

  const itemCount = Math.floor(rng() * 15) // 0..14 items
  const groceries = Array.from({ length: itemCount }, (_, i) => {
    const payer = memberIds[Math.floor(rng() * memberCount)]
    const sharerCount = 1 + Math.floor(rng() * memberCount)
    const shuffled = [...memberIds].sort(() => rng() - 0.5)
    const sharedBy = [...new Set(shuffled.slice(0, sharerCount))]
    // Skew toward small amounts (typical grocery prices) with an occasional large outlier,
    // so both everyday rounding and large-value precision get exercised.
    const isOutlier = rng() < 0.05
    const unitPriceMinorUnits = isOutlier
      ? Math.floor(rng() * 100_000_000)
      : Math.floor(rng() * 500_00)
    return makeGroceryItem({
      id: `g${i}`,
      paidBy: payer,
      sharedBy,
      unitPriceMinorUnits,
      quantity: 1 + Math.floor(rng() * 4),
      category: GROCERY_CATEGORIES[Math.floor(rng() * GROCERY_CATEGORIES.length)],
    })
  })

  return { memberIds, groceries }
}

const RANDOM_HOUSEHOLD_COUNT = 200

describe('computeSettlement — financial invariants (generative)', () => {
  for (let seed = 1; seed <= RANDOM_HOUSEHOLD_COUNT; seed += 1) {
    it(`holds every required invariant for randomly-generated household #${seed}`, () => {
      const rng = mulberry32(seed)
      const { memberIds, groceries } = generateRandomHousehold(rng)
      const members = memberIds.map((id) => makeMember(id))

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      // Invariant: sum(item allocations) = item total, for every item independently.
      // (calculateMemberBalances/splitEvenly already guarantee this per-item; re-derive the
      // expected grand total straight from the raw input, independently of the engine's own
      // internal bookkeeping, to catch a hypothetical double-count or drop bug.)
      const expectedTotalMinorUnits = groceries.reduce(
        (sum, item) => sum + item.unitPrice.minorUnits * item.quantity,
        0,
      )

      // Invariant: sum(all amounts paid) = sum(all grocery costs).
      const totalSpent = result.memberBalances.reduce((sum, m) => sum + m.spentMinorUnits, 0)
      expect(totalSpent).toBe(expectedTotalMinorUnits)

      // Invariant: sum(all consumption) = sum(all grocery costs).
      const totalConsumed = result.memberBalances.reduce((sum, m) => sum + m.consumedMinorUnits, 0)
      expect(totalConsumed).toBe(expectedTotalMinorUnits)

      // Invariant: sum(all net balances) = 0.
      const totalNet = result.memberBalances.reduce((sum, m) => sum + m.netBalanceMinorUnits, 0)
      expect(totalNet).toBe(0)

      // Invariant: no settlement pays the same member (no self-payment).
      for (const transfer of result.transfers) {
        expect(transfer.from).not.toBe(transfer.to)
      }

      // Invariant: no zero-value transaction.
      for (const transfer of result.transfers) {
        expect(transfer.amountMinorUnits).toBeGreaterThan(0)
        expect(Number.isInteger(transfer.amountMinorUnits)).toBe(true)
      }

      // Invariant: all final balances reconcile after applying settlements — every member's
      // net inflow/outflow across all transfers exactly cancels their net balance.
      const transferNet = summarizeTransfers(result.transfers)
      for (const balance of result.memberBalances) {
        expect(transferNet.get(balance.memberId) ?? 0).toBe(balance.netBalanceMinorUnits)
      }

      // Invariant: a household of N members with non-zero balances never needs more than
      // N-1 transfers to fully settle (a basic sanity bound on the settlement algorithm).
      const nonZeroCount = result.memberBalances.filter((m) => m.netBalanceMinorUnits !== 0).length
      expect(result.transfers.length).toBeLessThanOrEqual(Math.max(nonZeroCount - 1, 0))
    })
  }
})
