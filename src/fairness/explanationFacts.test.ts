import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import type { GroceryItem, GroceryItemId, HouseholdId, Member, MemberId } from '@/domain'
import { computeSettlement } from '@/engine'
import type { SettlementResult } from '@/engine'
import { MemberNotInSettlementError } from './errors'
import { buildFairnessExplanationFacts } from './explanationFacts'

const HOUSEHOLD_ID = 'household-1' as HouseholdId
const MAYEEN = 'member-mayeen' as MemberId
const RAHIM = 'member-rahim' as MemberId

const MEMBERS: readonly Member[] = [
  {
    id: MAYEEN,
    householdId: HOUSEHOLD_ID,
    name: 'Mayeen',
    email: 'mayeen@example.com',
    role: 'owner',
    membershipStatus: 'active',
    joinedAt: new Date('2026-01-01'),
  },
  {
    id: RAHIM,
    householdId: HOUSEHOLD_ID,
    name: 'Rahim',
    email: 'rahim@example.com',
    role: 'member',
    membershipStatus: 'active',
    joinedAt: new Date('2026-01-01'),
  },
]

function item(
  id: string,
  name: string,
  minorUnits: number,
  paidBy: MemberId,
  sharedBy: readonly MemberId[],
): GroceryItem {
  return {
    id: id as GroceryItemId,
    householdId: HOUSEHOLD_ID,
    name,
    category: 'pantry',
    unitPrice: { minorUnits, currency: CURRENCIES.BDT },
    quantity: 1,
    paidByMemberId: paidBy,
    sharedByMemberIds: sharedBy,
    addedAt: new Date('2026-01-01'),
  }
}

// Rahim shares rice, chicken, and cooking oil (splitting each with Mayeen), but only pays for snacks.
const GROCERIES: readonly GroceryItem[] = [
  item('g-rice', 'rice', 80000, MAYEEN, [MAYEEN, RAHIM]),
  item('g-chicken', 'chicken', 40000, MAYEEN, [MAYEEN, RAHIM]),
  item('g-oil', 'cooking oil', 20000, MAYEEN, [MAYEEN, RAHIM]),
  item('g-snacks', 'snacks', 20000, RAHIM, [MAYEEN, RAHIM]),
]

describe('buildFairnessExplanationFacts — the worked example', () => {
  const settlement = computeSettlement(MEMBERS, GROCERIES, CURRENCIES.BDT)

  it('computes Rahim owing exactly what the engine determined, from item data alone', () => {
    const facts = buildFairnessExplanationFacts({
      memberId: RAHIM,
      members: MEMBERS,
      groceries: GROCERIES,
      settlement,
    })

    expect(facts.memberName).toBe('Rahim')
    expect(facts.direction).toBe('owes')
    expect(facts.amountMinorUnits).toBe(60000)
    expect(facts.spentMinorUnits).toBe(20000)
    expect(facts.consumedMinorUnits).toBe(80000)
    expect(facts.itemsSharedIn).toEqual(['rice', 'chicken', 'cooking oil', 'snacks'])
    expect(facts.itemsPaidFor).toEqual(['snacks'])
  })

  it('resolves the opposite side as "is_owed", naming the same amount', () => {
    const facts = buildFairnessExplanationFacts({
      memberId: MAYEEN,
      members: MEMBERS,
      groceries: GROCERIES,
      settlement,
    })

    expect(facts.direction).toBe('is_owed')
    expect(facts.amountMinorUnits).toBe(60000)
    expect(facts.itemsPaidFor).toEqual(['rice', 'chicken', 'cooking oil'])
    expect(facts.itemsSharedIn).toEqual(['rice', 'chicken', 'cooking oil', 'snacks'])
  })

  it('resolves the transfer that settles this pair, with the counterparty name filled in', () => {
    const rahimFacts = buildFairnessExplanationFacts({
      memberId: RAHIM,
      members: MEMBERS,
      groceries: GROCERIES,
      settlement,
    })
    expect(rahimFacts.transfers).toEqual([
      { counterpartyMemberId: MAYEEN, counterpartyName: 'Mayeen', amountMinorUnits: 60000 },
    ])
  })
})

describe('buildFairnessExplanationFacts — direction resolution', () => {
  it('reports "settled" and an empty transfer list when net balance is exactly zero', () => {
    const settlement: SettlementResult = {
      currency: CURRENCIES.BDT,
      memberBalances: [
        { memberId: RAHIM, spentMinorUnits: 500, consumedMinorUnits: 500, netBalanceMinorUnits: 0 },
      ],
      transfers: [],
    }
    const facts = buildFairnessExplanationFacts({
      memberId: RAHIM,
      members: MEMBERS,
      groceries: [],
      settlement,
    })
    expect(facts.direction).toBe('settled')
    expect(facts.amountMinorUnits).toBe(0)
    expect(facts.transfers).toEqual([])
  })

  it('throws MemberNotInSettlementError for a member absent from the settlement result', () => {
    const settlement: SettlementResult = { currency: CURRENCIES.BDT, memberBalances: [], transfers: [] }
    expect(() =>
      buildFairnessExplanationFacts({ memberId: RAHIM, members: MEMBERS, groceries: [], settlement }),
    ).toThrow(MemberNotInSettlementError)
  })

  it('falls back to the raw id as a display name when the member record is missing', () => {
    const settlement: SettlementResult = {
      currency: CURRENCIES.BDT,
      memberBalances: [
        { memberId: RAHIM, spentMinorUnits: 0, consumedMinorUnits: 100, netBalanceMinorUnits: -100 },
      ],
      transfers: [],
    }
    const facts = buildFairnessExplanationFacts({ memberId: RAHIM, members: [], groceries: [], settlement })
    expect(facts.memberName).toBe(RAHIM)
  })

  it('only includes transfers that actually involve the requested member', () => {
    const KARIM = 'member-karim' as MemberId
    const settlement: SettlementResult = {
      currency: CURRENCIES.BDT,
      memberBalances: [
        { memberId: RAHIM, spentMinorUnits: 0, consumedMinorUnits: 100, netBalanceMinorUnits: -100 },
        { memberId: MAYEEN, spentMinorUnits: 200, consumedMinorUnits: 100, netBalanceMinorUnits: 100 },
        { memberId: KARIM, spentMinorUnits: 0, consumedMinorUnits: 0, netBalanceMinorUnits: 0 },
      ],
      transfers: [{ from: RAHIM, to: MAYEEN, amountMinorUnits: 100 }],
    }
    const karimFacts = buildFairnessExplanationFacts({
      memberId: KARIM,
      members: MEMBERS,
      groceries: [],
      settlement,
    })
    expect(karimFacts.transfers).toEqual([])
  })
})
