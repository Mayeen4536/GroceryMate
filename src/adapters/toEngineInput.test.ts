import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { HouseholdId } from '@/domain/ids'
import { computeSettlement } from '@/engine'
import { AmbiguousMemberNameError, InvalidGroceryPriceError, UnresolvableMemberNameError } from './errors'
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
    paidBy: '',
    sharedBy: [],
    notes: '',
    ...overrides,
  }
}

describe('toEngineInput', () => {
  it('converts UI members and groceries into engine-valid domain input', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' }), makeUIMember({ id: 'm-2', name: 'Bilal Ahmed' })]
    const groceries = [
      makeUIGrocery({ id: 'g-1', name: 'Milk', price: '100', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan', 'Bilal Ahmed'] }),
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
        paidBy: 'Aisha Khan',
        sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee'],
      }),
      makeUIGrocery({
        id: 'g-2',
        name: 'Chicken',
        price: '600',
        paidBy: 'Bilal Ahmed',
        sharedBy: ['Aisha Khan', 'Bilal Ahmed'],
      }),
    ]

    const { members: engineMembers, groceries: engineGroceries } = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)
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

  it('throws UnresolvableMemberNameError when a grocery item was paid by someone no longer a member', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [makeUIGrocery({ id: 'g-1', paidBy: 'Someone Removed', sharedBy: ['Aisha Khan'] })]
    expect(() => toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)).toThrow(UnresolvableMemberNameError)
  })

  it('throws UnresolvableMemberNameError when a grocery item is shared by someone no longer a member', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [makeUIGrocery({ id: 'g-1', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan', 'Ghost'] })]
    expect(() => toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)).toThrow(UnresolvableMemberNameError)
  })

  it('throws AmbiguousMemberNameError rather than guessing when two members share a name', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Sam' }), makeUIMember({ id: 'm-2', name: 'Sam' })]
    const groceries = [makeUIGrocery({ id: 'g-1', paidBy: 'Sam', sharedBy: ['Sam'] })]
    expect(() => toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)).toThrow(AmbiguousMemberNameError)
  })

  it('throws InvalidGroceryPriceError for a price string that cannot be parsed', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [makeUIGrocery({ id: 'g-1', price: 'not-a-number', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan'] })]
    expect(() => toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)).toThrow(InvalidGroceryPriceError)
  })

  it('converts a decimal price into exact minor units, matching parseMoneyInput', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const groceries = [
      makeUIGrocery({ id: 'g-1', price: '49.99', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan'] }),
    ]
    const { groceries: engineGroceries } = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)
    expect(engineGroceries[0].unitPrice.minorUnits).toBe(4999)
  })

  it('handles an empty grocery list against a non-empty household without error', () => {
    const members = [makeUIMember({ id: 'm-1', name: 'Aisha Khan' })]
    const { members: engineMembers, groceries: engineGroceries } = toEngineInput(members, [], BDT, HOUSEHOLD_ID)
    expect(engineMembers).toHaveLength(1)
    expect(engineGroceries).toHaveLength(0)
  })
})
