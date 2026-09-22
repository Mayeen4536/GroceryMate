import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { HouseholdId } from '@/domain/ids'
import { computeSettlement } from '@/engine'
import { InvalidGroceryPriceError } from './errors'
import { toEngineInput } from './toEngineInput'
import type { GroceryItem as UIGroceryItem } from '@/types/grocery'
import type { Member as UIMember } from '@/types/member'

const BDT = CURRENCIES.BDT
const HOUSEHOLD_ID = 'household-1' as HouseholdId

function makeUIMember(overrides: Partial<UIMember> & { id: string; name: string }): UIMember {
  return {
    email: `${overrides.id}@example.com`,
    tone: 0,
    role: 'member',
    status: 'settled',
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
    ...overrides,
  }
}

function makeUIGrocery(overrides: Partial<UIGroceryItem> & { id: string }): UIGroceryItem {
  return {
    name: 'Test item',
    price: '0',
    quantity: 1,
    category: 'pantry',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('toEngineInput', () => {
  it('converts UI members and groceries into engine-valid domain input', () => {
    const members = [
      makeUIMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeUIMember({ id: 'm-2', name: 'Bilal Ahmed' }),
    ]
    const groceries = [
      makeUIGrocery({
        id: 'g-1',
        name: 'Milk',
        price: '100',
        paidByMemberId: 'm-1',
        sharedByMemberIds: ['m-1', 'm-2'],
      }),
    ]

    const engineInput = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)

    expect(engineInput.members).toHaveLength(2)
    expect(engineInput.groceries).toHaveLength(1)
    expect(engineInput.groceries[0].unitPrice).toEqual({ minorUnits: 10000, currency: BDT })
    expect(engineInput.groceries[0].paidByMemberId).toBe('m-1')
    expect(engineInput.groceries[0].sharedByMemberIds).toEqual(['m-1', 'm-2'])
  })

  it('produces output the real engine accepts and computes correctly end to end', () => {
    const members = [
      makeUIMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeUIMember({ id: 'm-2', name: 'Bilal Ahmed' }),
      makeUIMember({ id: 'm-3', name: 'Chloe Lee' }),
    ]
    const groceries = [
      makeUIGrocery({
        id: 'g-1',
        name: 'Rice',
        price: '900',
        paidByMemberId: 'm-1',
        sharedByMemberIds: ['m-1', 'm-2', 'm-3'],
      }),
      makeUIGrocery({
        id: 'g-2',
        name: 'Chicken',
        price: '600',
        paidByMemberId: 'm-2',
        sharedByMemberIds: ['m-1', 'm-2'],
      }),
    ]

    const { members: engineMembers, groceries: engineGroceries } = toEngineInput(
      members,
      groceries,
      BDT,
      HOUSEHOLD_ID,
    )
    const result = computeSettlement(engineMembers, engineGroceries, BDT)

    const balanceOf = (id: string) => result.memberBalances.find((b) => b.memberId === id)!
    expect(balanceOf('m-1').consumedMinorUnits).toBe(60000) // Aisha: 300 (rice) + 300 (chicken)
    expect(balanceOf('m-2').consumedMinorUnits).toBe(60000) // Bilal: 300 (rice) + 300 (chicken)
    expect(balanceOf('m-3').consumedMinorUnits).toBe(30000) // Chloe: 300 (rice) only
    expect(result.transfers).toEqual([{ from: 'm-3', to: 'm-1', amountMinorUnits: 30000 }])
  })

  it('marks an invited member with membershipStatus "invited" rather than "active"', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Fatima Noor', status: 'invited' })]
    const { members: engineMembers } = toEngineInput(members, [], BDT, HOUSEHOLD_ID)
    expect(engineMembers[0].membershipStatus).toBe('invited')
  })

  it('marks an archived member with membershipStatus "archived" rather than "active" (an exhaustive switch, not a ternary, guards this)', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Daniyal Raza', status: 'archived' })]
    const { members: engineMembers } = toEngineInput(members, [], BDT, HOUSEHOLD_ID)
    expect(engineMembers[0].membershipStatus).toBe('archived')
  })

  it('throws InvalidGroceryPriceError for a price string that cannot be parsed', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [
      makeUIGrocery({ id: 'g-1', price: 'not-a-number', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1'] }),
    ]
    expect(() => toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)).toThrow(InvalidGroceryPriceError)
  })

  it('converts a decimal price into exact minor units, matching parseMoneyInput', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [
      makeUIGrocery({ id: 'g-1', price: '49.99', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1'] }),
    ]
    const { groceries: engineGroceries } = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)
    expect(engineGroceries[0].unitPrice.minorUnits).toBe(4999)
  })

  it("always feeds the engine quantity 1, regardless of the persisted item's own (display-only) quantity — price is already the line total, not a unit price", () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [
      makeUIGrocery({
        id: 'g-1',
        price: '100',
        quantity: 5,
        paidByMemberId: 'm-1',
        sharedByMemberIds: ['m-1'],
      }),
    ]
    const { groceries: engineGroceries } = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)
    expect(engineGroceries[0].quantity).toBe(1)

    // Confirms the engine itself would double-count if this weren't fixed at 1:
    // consumedMinorUnits should be exactly 10000 (100 taka), not 50000 (× 5).
    const result = computeSettlement(
      toEngineInput(members, groceries, BDT, HOUSEHOLD_ID).members,
      engineGroceries,
      BDT,
    )
    expect(result.memberBalances[0].consumedMinorUnits).toBe(10000)
  })

  it('handles an empty grocery list against a non-empty household without error', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const { members: engineMembers, groceries: engineGroceries } = toEngineInput(
      members,
      [],
      BDT,
      HOUSEHOLD_ID,
    )
    expect(engineMembers).toHaveLength(1)
    expect(engineGroceries).toHaveLength(0)
  })
})
