import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { MemberId } from '@/domain/ids'
import { calculateMemberBalances } from './calculateMemberBalances'
import {
  DuplicateMemberError,
  DuplicateSharedByError,
  EmptySharedByError,
  InvalidAmountError,
  MixedCurrencyError,
  UnknownMemberError,
} from './errors'
import { TEST_CURRENCY, makeGroceryItem, makeMember } from './testHelpers'

function balanceOf(
  balances: ReturnType<typeof calculateMemberBalances>,
  id: string,
): ReturnType<typeof calculateMemberBalances>[number] {
  const found = balances.find((b) => b.memberId === (id as MemberId))
  if (!found) throw new Error(`No balance found for "${id}" in test`)
  return found
}

describe('calculateMemberBalances', () => {
  it('splits a shared grocery item evenly among its sharers', () => {
    const members = [makeMember('a'), makeMember('b'), makeMember('c')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a', 'b', 'c'], unitPriceMinorUnits: 300 }),
    ]

    const balances = calculateMemberBalances(members, groceries, TEST_CURRENCY)

    expect(balanceOf(balances, 'a')).toEqual({
      memberId: 'a',
      spentMinorUnits: 300,
      consumedMinorUnits: 100,
      netBalanceMinorUnits: 200,
    })
    expect(balanceOf(balances, 'b')).toEqual({
      memberId: 'b',
      spentMinorUnits: 0,
      consumedMinorUnits: 100,
      netBalanceMinorUnits: -100,
    })
    expect(balanceOf(balances, 'c')).toEqual({
      memberId: 'c',
      spentMinorUnits: 0,
      consumedMinorUnits: 100,
      netBalanceMinorUnits: -100,
    })
  })

  it('leaves a personal item with zero net effect on the buyer and no effect on anyone else', () => {
    const members = [makeMember('a'), makeMember('b')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: 499, quantity: 2 }),
    ]

    const balances = calculateMemberBalances(members, groceries, TEST_CURRENCY)

    expect(balanceOf(balances, 'a')).toEqual({
      memberId: 'a',
      spentMinorUnits: 998,
      consumedMinorUnits: 998,
      netBalanceMinorUnits: 0,
    })
    expect(balanceOf(balances, 'b')).toEqual({
      memberId: 'b',
      spentMinorUnits: 0,
      consumedMinorUnits: 0,
      netBalanceMinorUnits: 0,
    })
  })

  it('aggregates spending correctly across multiple payers and multiple items', () => {
    const members = [makeMember('a'), makeMember('b'), makeMember('c')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a', 'b', 'c'], unitPriceMinorUnits: 300 }),
      makeGroceryItem({ id: 'g2', paidBy: 'b', sharedBy: ['a', 'b', 'c'], unitPriceMinorUnits: 600 }),
      makeGroceryItem({ id: 'g3', paidBy: 'c', sharedBy: ['c'], unitPriceMinorUnits: 150 }),
    ]

    const balances = calculateMemberBalances(members, groceries, TEST_CURRENCY)

    // Total spent across the household must equal total consumed: 300+600+150 = 1050 each side.
    const totalSpent = balances.reduce((sum, b) => sum + b.spentMinorUnits, 0)
    const totalConsumed = balances.reduce((sum, b) => sum + b.consumedMinorUnits, 0)
    expect(totalSpent).toBe(1050)
    expect(totalConsumed).toBe(1050)

    expect(balanceOf(balances, 'a').spentMinorUnits).toBe(300)
    expect(balanceOf(balances, 'b').spentMinorUnits).toBe(600)
    expect(balanceOf(balances, 'c').spentMinorUnits).toBe(150)

    // g1 (300/3=100) + g2 (600/3=200) shared by everyone; g3 (150) only by c.
    expect(balanceOf(balances, 'a').consumedMinorUnits).toBe(300)
    expect(balanceOf(balances, 'b').consumedMinorUnits).toBe(300)
    expect(balanceOf(balances, 'c').consumedMinorUnits).toBe(450)

    const netTotal = balances.reduce((sum, b) => sum + b.netBalanceMinorUnits, 0)
    expect(netTotal).toBe(0)
  })

  it('splits a non-evenly-divisible decimal price exactly, down to the last minor unit', () => {
    // 49.99 stored as 4999 minor units, shared by two people: 2500 + 2499.
    const members = [makeMember('a'), makeMember('b')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a', 'b'], unitPriceMinorUnits: 4999 }),
    ]

    const balances = calculateMemberBalances(members, groceries, TEST_CURRENCY)
    const consumedA = balanceOf(balances, 'a').consumedMinorUnits
    const consumedB = balanceOf(balances, 'b').consumedMinorUnits

    expect(consumedA + consumedB).toBe(4999)
    expect([consumedA, consumedB].sort((x, y) => x - y)).toEqual([2499, 2500])
  })

  it('includes members with no grocery activity at all, with all-zero values', () => {
    const members = [makeMember('a'), makeMember('b')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: 500 })]

    const balances = calculateMemberBalances(members, groceries, TEST_CURRENCY)

    expect(balanceOf(balances, 'b')).toEqual({
      memberId: 'b',
      spentMinorUnits: 0,
      consumedMinorUnits: 0,
      netBalanceMinorUnits: 0,
    })
  })

  it('returns all-zero balances for every member when there are no groceries', () => {
    const members = [makeMember('a'), makeMember('b'), makeMember('c')]
    const balances = calculateMemberBalances(members, [], TEST_CURRENCY)

    expect(balances).toHaveLength(3)
    for (const balance of balances) {
      expect(balance.spentMinorUnits).toBe(0)
      expect(balance.consumedMinorUnits).toBe(0)
      expect(balance.netBalanceMinorUnits).toBe(0)
    }
  })

  it('returns balances sorted by member id regardless of input order', () => {
    const members = [makeMember('charlie'), makeMember('alice'), makeMember('bob')]
    const balances = calculateMemberBalances(members, [], TEST_CURRENCY)
    expect(balances.map((b) => b.memberId)).toEqual(['alice', 'bob', 'charlie'])
  })

  it('throws when a grocery item was paid by someone outside the members list', () => {
    const members = [makeMember('a')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'ghost', sharedBy: ['a'], unitPriceMinorUnits: 100 })]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(UnknownMemberError)
  })

  it('throws when a grocery item is shared with someone outside the members list', () => {
    const members = [makeMember('a')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a', 'ghost'], unitPriceMinorUnits: 100 })]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(UnknownMemberError)
  })

  it('throws when a grocery item has nobody sharing it', () => {
    const members = [makeMember('a')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: [], unitPriceMinorUnits: 100 })]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(EmptySharedByError)
  })

  it('throws when a grocery item lists the same sharer twice', () => {
    const members = [makeMember('a'), makeMember('b')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a', 'b', 'a'], unitPriceMinorUnits: 100 }),
    ]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(DuplicateSharedByError)
  })

  it('throws when a grocery item is priced in a different currency than the settlement', () => {
    const members = [makeMember('a')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: 100, currency: CURRENCIES.USD }),
    ]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(MixedCurrencyError)
  })

  it('throws on a negative price', () => {
    const members = [makeMember('a')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: -1 })]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(InvalidAmountError)
  })

  it('throws on a fractional (non-integer) minor-unit price', () => {
    const members = [makeMember('a')]
    const groceries = [makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: 10.5 })]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(InvalidAmountError)
  })

  it('throws on a zero or negative quantity', () => {
    const members = [makeMember('a')]
    const groceries = [
      makeGroceryItem({ id: 'g1', paidBy: 'a', sharedBy: ['a'], unitPriceMinorUnits: 100, quantity: 0 }),
    ]
    expect(() => calculateMemberBalances(members, groceries, TEST_CURRENCY)).toThrow(InvalidAmountError)
  })

  it('throws when the same member id is listed twice in the members list', () => {
    const members = [makeMember('a'), makeMember('a')]
    expect(() => calculateMemberBalances(members, [], TEST_CURRENCY)).toThrow(DuplicateMemberError)
  })
})
