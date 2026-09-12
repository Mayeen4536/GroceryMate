import { describe, expect, it } from 'vitest'
import { buildMemberOptions } from '@/hooks/useMemberOptions'
import { isFullyResolved } from './GeneratedGroceries'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

/**
 * Regression coverage for a real bug caught while wiring the Assistant's
 * review flow to real persistence (see docs/GROCERY_INTEGRATION.md):
 * treating an item as "resolved" whenever its stored payer/sharer *ids*
 * were non-empty — regardless of whether those ids still matched a
 * current, selectable member — would let a stale reference ride straight
 * into the real grocery list on submit, which the settlement engine would
 * only catch later. `isFullyResolved` must check against the current
 * *selectable* roster, not just id presence.
 */

function makeMember(overrides: Partial<Member> & { id: string; name: string }): Member {
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

function makeItem(overrides: Partial<GroceryItem> & { id: string }): GroceryItem {
  return {
    name: 'Test item',
    price: '100',
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

const CURRENT_MEMBERS = [makeMember({ id: 'm-1', name: 'Aisha Khan' }), makeMember({ id: 'm-2', name: 'Bilal Ahmed' })]

describe('isFullyResolved', () => {
  it('is resolved when payer and sharers all match current, selectable members', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1', 'm-2'] })
    expect(isFullyResolved(item, memberOptions)).toBe(true)
  })

  it('is not resolved when the payer id is empty', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidByMemberId: '', sharedByMemberIds: ['m-1'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is not resolved when sharedByMemberIds is empty', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-1', sharedByMemberIds: [] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when the payer id no longer matches any current, selectable member', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    // "m-9" was removed from the household after this mock content was authored.
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-9', sharedByMemberIds: ['m-1'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when sharedByMemberIds mixes one valid id with one stale id', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-1', sharedByMemberIds: ['m-1', 'm-9'] })
    // Would previously have been treated as "resolved" (the id list was non-empty),
    // letting the stale "m-9" reference reach the real grocery list untouched.
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when the referenced id belongs to an archived member (no longer selectable)', () => {
    const members = [...CURRENT_MEMBERS, makeMember({ id: 'm-3', name: 'Chloe Lee', status: 'archived' })]
    const memberOptions = buildMemberOptions(members)
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-3', sharedByMemberIds: ['m-1'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('a newly-added member becomes a valid resolution target immediately', () => {
    const before = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidByMemberId: 'm-3', sharedByMemberIds: ['m-3'] })
    expect(isFullyResolved(item, before)).toBe(false)

    const after = buildMemberOptions([...CURRENT_MEMBERS, makeMember({ id: 'm-3', name: 'Zara Islam' })])
    expect(isFullyResolved(item, after)).toBe(true)
  })
})
