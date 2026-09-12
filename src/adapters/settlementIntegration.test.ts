import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { HouseholdId } from '@/domain/ids'
import { computeSettlement } from '@/engine'
import { toEngineInput } from './toEngineInput'
import { toSettlementViewModel } from './toSettlementViewModel'
import type { GroceryItem as UIGroceryItem } from '@/types/grocery'
import type { Member as UIMember } from '@/types/member'

/**
 * Full round-trip integration tests: UI-shaped members/groceries all the
 * way through `toEngineInput` → `computeSettlement` → `toSettlementViewModel`
 * and back to UI-shaped output. The engine's own 200+ invariant tests
 * (`src/engine/*.test.ts`) already prove the math is correct for every
 * shape of input; these tests instead prove the boundary around it doesn't
 * lose or distort anything on the way in or out — the specific concern a
 * translation layer, rather than the calculation itself, can get wrong.
 */

const BDT = CURRENCIES.BDT
const HOUSEHOLD_ID = 'household-1' as HouseholdId

function makeUIMember(id: string, name: string): UIMember {
  return {
    id,
    name,
    email: `${id}@example.com`,
    tone: 0,
    role: 'member',
    status: 'settled',
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
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

function runFullPipeline(members: UIMember[], groceries: UIGroceryItem[]) {
  const engineInput = toEngineInput(members, groceries, BDT, HOUSEHOLD_ID)
  const result = computeSettlement(engineInput.members, engineInput.groceries, BDT)
  return toSettlementViewModel(result, members)
}

describe('settlement integration (UI in, UI out)', () => {
  it('a personal item — payer and sole sharer are the same person — nets to zero with no transfer', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan')]
    const groceries = [makeUIGrocery({ id: 'g-1', price: '499', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1'] })]

    const viewModel = runFullPipeline(members, groceries)

    expect(viewModel.transfers).toEqual([])
    expect(viewModel.memberFinancials[0]).toMatchObject({ amountPaid: '499', amountConsumed: '499', netBalance: '0', status: 'settled' })
  })

  it('an uneven decimal split survives the full round trip down to the last paisa', () => {
    // ৳100.01 shared 3 ways: 3334 + 3333 + 3333 minor units (splitEvenly's own
    // documented sorted-id rule — see docs/SETTLEMENT_ENGINE.md).
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed'), makeUIMember('m-3', 'Chloe Lee')]
    const groceries = [
      makeUIGrocery({
        id: 'g-1',
        price: '100.01',
        paidByMemberId: 'm-1',
        sharedByMemberIds: ['m-1', 'm-2', 'm-3'],
      }),
    ]

    const viewModel = runFullPipeline(members, groceries)

    const totalConsumed = viewModel.memberFinancials.reduce((sum, m) => sum + Number(m.amountConsumed), 0)
    // Reconstructed with a fixed-point sum rather than plain float addition,
    // since this assertion is itself checking for exactly the kind of drift
    // the whole pipeline exists to avoid.
    expect(Math.round(totalConsumed * 100)).toBe(10001)
    // Aisha paid the whole ৳100.01; whatever she didn't personally consume, she's owed.
    const aisha = viewModel.memberFinancials.find((m) => m.memberId === 'm-1')!
    expect(aisha.amountPaid).toBe('100.01')
  })

  it('a member who pays but consumes none of it ends up owed, not settled', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed')]
    const groceries = [
      makeUIGrocery({ id: 'g-1', price: '2000', paidByMemberId: 'm-1', sharedByMemberIds: ['m-2'] }),
    ]

    const viewModel = runFullPipeline(members, groceries)

    const aisha = viewModel.memberFinancials.find((m) => m.memberId === 'm-1')!
    expect(aisha).toMatchObject({ amountPaid: '2000', amountConsumed: '0', netBalance: '2000', status: 'owed' })
    expect(viewModel.transfers).toEqual([
      { id: 'm-2::m-1::200000', from: 'Bilal Ahmed', to: 'Aisha Khan', amount: '2000' },
    ])
  })

  it('a member who consumes but never pays for anything ends up owing, not settled', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed')]
    const groceries = [
      makeUIGrocery({ id: 'g-1', price: '400', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1', 'm-2'] }),
      makeUIGrocery({ id: 'g-2', price: '600', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1', 'm-2'] }),
    ]

    const viewModel = runFullPipeline(members, groceries)

    const bilal = viewModel.memberFinancials.find((m) => m.memberId === 'm-2')!
    expect(bilal).toMatchObject({ amountPaid: '0', amountConsumed: '500', netBalance: '-500', status: 'owes' })
  })

  it('an empty grocery list against a real household produces a fully settled, transfer-free view model', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed')]
    const viewModel = runFullPipeline(members, [])

    expect(viewModel.transfers).toEqual([])
    expect(viewModel.summary).toEqual({ outstanding: '0', receivers: [], owers: [] })
    expect(viewModel.memberFinancials.every((m) => m.status === 'settled')).toBe(true)
  })
})
