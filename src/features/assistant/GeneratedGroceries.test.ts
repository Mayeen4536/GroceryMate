import { describe, expect, it } from 'vitest'
import { buildMemberOptions } from '@/hooks/useMemberOptions'
import { isFullyResolved } from './GeneratedGroceries'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

/**
 * Regression coverage for a real bug caught while wiring the Assistant's
 * review flow to the live roster (see docs / final report): treating an
 * item as "resolved" whenever its stored payer/sharer *strings* were
 * non-empty — regardless of whether those names still matched a current
 * member — would let a stale reference ride straight into the real
 * grocery list on submit, which the settlement engine would only catch
 * later. `isFullyResolved` must check against the current roster, not
 * just string presence.
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
    paidBy: '',
    sharedBy: [],
    notes: '',
    ...overrides,
  }
}

const CURRENT_MEMBERS = [makeMember({ id: 'm-1', name: 'Aisha Khan' }), makeMember({ id: 'm-2', name: 'Bilal Ahmed' })]

describe('isFullyResolved', () => {
  it('is resolved when payer and sharers all match current members', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan', 'Bilal Ahmed'] })
    expect(isFullyResolved(item, memberOptions)).toBe(true)
  })

  it('is not resolved when the payer is empty', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidBy: '', sharedBy: ['Aisha Khan'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is not resolved when sharedBy is empty', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidBy: 'Aisha Khan', sharedBy: [] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when the payer name is non-empty but no longer matches any current member', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    // "Daniyal Raza" was removed from the household after this mock content was authored.
    const item = makeItem({ id: 'g-1', paidBy: 'Daniyal Raza', sharedBy: ['Aisha Khan'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when sharedBy mixes one valid name with one stale name', () => {
    const memberOptions = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidBy: 'Aisha Khan', sharedBy: ['Aisha Khan', 'Daniyal Raza'] })
    // Would previously have been treated as "resolved" (the string list was non-empty),
    // letting the stale "Daniyal Raza" reference reach the real grocery list untouched.
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('is NOT resolved when the payer name is ambiguous between two current members', () => {
    const members = [
      makeMember({ id: 'm-1', name: 'Sam Test' }),
      makeMember({ id: 'm-2', name: 'Sam Test' }),
    ]
    const memberOptions = buildMemberOptions(members)
    const item = makeItem({ id: 'g-1', paidBy: 'Sam Test', sharedBy: ['Sam Test'] })
    expect(isFullyResolved(item, memberOptions)).toBe(false)
  })

  it('a newly-added member becomes a valid resolution target immediately', () => {
    const before = buildMemberOptions(CURRENT_MEMBERS)
    const item = makeItem({ id: 'g-1', paidBy: 'Zara Islam', sharedBy: ['Zara Islam'] })
    expect(isFullyResolved(item, before)).toBe(false)

    const after = buildMemberOptions([...CURRENT_MEMBERS, makeMember({ id: 'm-3', name: 'Zara Islam' })])
    expect(isFullyResolved(item, after)).toBe(true)
  })
})
