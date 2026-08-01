import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import { computeSettlement } from './settlementEngine'
import { MixedCurrencyError } from './errors'
import { TEST_CURRENCY, makeGroceryItem, makeMember, summarizeTransfers } from './testHelpers'

/** Every scenario below must hold: total spent, total consumed, and net balances always agree. */
function expectLedgerIntegrity(result: ReturnType<typeof computeSettlement>) {
  const totalSpent = result.memberBalances.reduce((sum, m) => sum + m.spentMinorUnits, 0)
  const totalConsumed = result.memberBalances.reduce((sum, m) => sum + m.consumedMinorUnits, 0)
  const totalNet = result.memberBalances.reduce((sum, m) => sum + m.netBalanceMinorUnits, 0)
  expect(totalSpent).toBe(totalConsumed)
  expect(totalNet).toBe(0)

  const transferNet = summarizeTransfers(result.transfers)
  for (const balance of result.memberBalances) {
    expect(transferNet.get(balance.memberId) ?? 0).toBe(balance.netBalanceMinorUnits)
  }
}

describe('computeSettlement', () => {
  describe('shared groceries', () => {
    it('splits a group grocery run fairly and settles it in the minimum number of payments', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe')]
      const groceries = [
        makeGroceryItem({ id: 'g1', name: 'Milk', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe'], unitPriceMinorUnits: 24000 }),
        makeGroceryItem({ id: 'g2', name: 'Rice', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe'], unitPriceMinorUnits: 145000 }),
      ]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      expect(result.transfers).toHaveLength(2)
      expect(result.transfers.every((t) => t.to === 'aisha')).toBe(true)
    })
  })

  describe('personal groceries', () => {
    it('lets a personal purchase pass through with no effect on the rest of the household', () => {
      const members = [makeMember('aisha'), makeMember('bilal')]
      const groceries = [
        // A shared item that would otherwise settle perfectly...
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha', 'bilal'], unitPriceMinorUnits: 200 }),
        // ...plus a personal snack bilal buys only for himself.
        makeGroceryItem({ id: 'g2', paidBy: 'bilal', sharedBy: ['bilal'], unitPriceMinorUnits: 350 }),
      ]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      // The personal item is self-cancelling: bilal only owes his 100 share of the shared item.
      expect(result.transfers).toEqual([{ from: 'bilal', to: 'aisha', amountMinorUnits: 100 }])
    })

    it('produces zero transfers when every item is a personal purchase', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe')]
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha'], unitPriceMinorUnits: 500 }),
        makeGroceryItem({ id: 'g2', paidBy: 'bilal', sharedBy: ['bilal'], unitPriceMinorUnits: 700 }),
        makeGroceryItem({ id: 'g3', paidBy: 'chloe', sharedBy: ['chloe'], unitPriceMinorUnits: 900 }),
      ]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      expect(result.transfers).toEqual([])
      expect(result.memberBalances.every((b) => b.netBalanceMinorUnits === 0)).toBe(true)
    })
  })

  describe('multiple payers', () => {
    it('nets out correctly when several members take turns paying', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe'), makeMember('daniyal')]
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe', 'daniyal'], unitPriceMinorUnits: 40000 }),
        makeGroceryItem({ id: 'g2', paidBy: 'bilal', sharedBy: ['aisha', 'bilal', 'chloe', 'daniyal'], unitPriceMinorUnits: 20000 }),
        makeGroceryItem({ id: 'g3', paidBy: 'chloe', sharedBy: ['aisha', 'bilal', 'chloe', 'daniyal'], unitPriceMinorUnits: 8000 }),
        makeGroceryItem({ id: 'g4', paidBy: 'daniyal', sharedBy: ['aisha', 'bilal'], unitPriceMinorUnits: 6000 }),
      ]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      // 4 members with non-zero balances (or fewer) never needs more than 3 transfers.
      expect(result.transfers.length).toBeLessThanOrEqual(3)
    })
  })

  describe('decimal prices', () => {
    it('keeps every last cent accounted for when a price does not divide evenly', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe')]
      // ৳49.99 (4999 minor units) split three ways: 1667 + 1666 + 1666.
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe'], unitPriceMinorUnits: 4999 }),
      ]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      const consumedTotal = result.memberBalances.reduce((sum, m) => sum + m.consumedMinorUnits, 0)
      expect(consumedTotal).toBe(4999)
      expect(Number.isInteger(consumedTotal)).toBe(true)
    })

    it('accumulates many odd decimal prices without drifting off by a cent', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe')]
      const oddPrices = [199, 349, 1099, 2599, 4999, 333, 1, 7]
      const groceries = oddPrices.map((price, index) =>
        makeGroceryItem({
          id: `g${index}`,
          paidBy: index % 2 === 0 ? 'aisha' : 'bilal',
          sharedBy: ['aisha', 'bilal', 'chloe'],
          unitPriceMinorUnits: price,
        }),
      )

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      const expectedTotal = oddPrices.reduce((sum, price) => sum + price, 0)
      const totalConsumed = result.memberBalances.reduce((sum, m) => sum + m.consumedMinorUnits, 0)
      expect(totalConsumed).toBe(expectedTotal)
    })
  })

  describe('large households', () => {
    it('settles a 50-member household with many shared items, exactly and within the transaction bound', () => {
      const memberCount = 50
      const members = Array.from({ length: memberCount }, (_, i) => makeMember(`member-${String(i).padStart(3, '0')}`))
      const memberIds = members.map((m) => m.id)

      const groceries = Array.from({ length: 120 }, (_, i) => {
        const payer = memberIds[i % memberCount]
        // Each item is shared by a rotating window of five members (always including the payer).
        const sharedBy = Array.from({ length: 5 }, (_, offset) => memberIds[(i + offset) % memberCount])
        return makeGroceryItem({
          id: `g${i}`,
          paidBy: payer,
          sharedBy: [...new Set([payer, ...sharedBy])],
          unitPriceMinorUnits: 137 + (i % 53) * 11,
          quantity: 1 + (i % 3),
        })
      })

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expectLedgerIntegrity(result)
      const nonZeroCount = result.memberBalances.filter((b) => b.netBalanceMinorUnits !== 0).length
      expect(result.transfers.length).toBeLessThanOrEqual(Math.max(nonZeroCount - 1, 0))
    })
  })

  describe('edge cases', () => {
    it('returns an all-zero, transfer-free result for a household with no groceries yet', () => {
      const members = [makeMember('aisha'), makeMember('bilal')]
      const result = computeSettlement(members, [], TEST_CURRENCY)

      expect(result.transfers).toEqual([])
      expect(result.memberBalances.every((b) => b.spentMinorUnits === 0 && b.consumedMinorUnits === 0)).toBe(true)
    })

    it('handles a single-member household with no possible debt', () => {
      const members = [makeMember('aisha')]
      const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha'], unitPriceMinorUnits: 5000 })]

      const result = computeSettlement(members, groceries, TEST_CURRENCY)

      expect(result.transfers).toEqual([])
      expect(result.memberBalances).toEqual([
        { memberId: 'aisha', spentMinorUnits: 5000, consumedMinorUnits: 5000, netBalanceMinorUnits: 0 },
      ])
    })

    it('produces identical results when members and groceries are supplied in a different order', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe')]
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe'], unitPriceMinorUnits: 300 }),
        makeGroceryItem({ id: 'g2', paidBy: 'bilal', sharedBy: ['bilal', 'chloe'], unitPriceMinorUnits: 150 }),
      ]

      const forward = computeSettlement(members, groceries, TEST_CURRENCY)
      const reversed = computeSettlement([...members].reverse(), [...groceries].reverse(), TEST_CURRENCY)

      expect(reversed).toEqual(forward)
    })

    it('is stable across repeated calls with the same input (no hidden randomness or shared state)', () => {
      const members = [makeMember('aisha'), makeMember('bilal'), makeMember('chloe'), makeMember('daniyal')]
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha', 'bilal', 'chloe', 'daniyal'], unitPriceMinorUnits: 999 }),
        makeGroceryItem({ id: 'g2', paidBy: 'daniyal', sharedBy: ['bilal', 'chloe'], unitPriceMinorUnits: 501 }),
      ]

      const results = Array.from({ length: 5 }, () => computeSettlement(members, groceries, TEST_CURRENCY))
      for (const result of results.slice(1)) {
        expect(result).toEqual(results[0])
      }
    })

    it('rejects a grocery item priced in a currency other than the household settlement currency', () => {
      const members = [makeMember('aisha')]
      const groceries = [
        makeGroceryItem({ id: 'g1', paidBy: 'aisha', sharedBy: ['aisha'], unitPriceMinorUnits: 100, currency: CURRENCIES.USD }),
      ]
      expect(() => computeSettlement(members, groceries, TEST_CURRENCY)).toThrow(MixedCurrencyError)
    })

    it('reports the settlement currency on the result even when nobody has bought anything', () => {
      const result = computeSettlement([makeMember('aisha')], [], CURRENCIES.USD)
      expect(result.currency).toEqual(CURRENCIES.USD)
    })
  })
})
