import { describe, expect, it } from 'vitest'
import { buildHistoryEntries } from './buildHistoryEntries'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

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

describe('buildHistoryEntries', () => {
  it('turns an empty grocery list into an empty history — never fabricates a placeholder entry', () => {
    expect(buildHistoryEntries([], [])).toEqual([])
  })

  it('produces exactly one entry per real grocery, in the same order it was given — no session grouping', () => {
    const members = [makeMember({ id: 'm-1', name: 'Aisha' })]
    const groceries = [
      makeItem({ id: 'g-1', name: 'Milk', createdAt: '2026-03-05T10:00:00.000Z', paidByMemberId: 'm-1' }),
      makeItem({ id: 'g-2', name: 'Rice', createdAt: '2026-03-01T10:00:00.000Z', paidByMemberId: 'm-1' }),
    ]

    const entries = buildHistoryEntries(groceries, members)

    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.id)).toEqual(['g-1', 'g-2'])
  })

  it('keeps amount as the untouched price string — no math happens while building entries', () => {
    const groceries = [makeItem({ id: 'g-1', price: '499.50' })]
    const entries = buildHistoryEntries(groceries, [])
    expect(entries[0].amount).toBe('499.50')
  })

  it('resolves an archived member reference by id — a historical entry still shows a real name, not a blank', () => {
    const archived = makeMember({
      id: 'm-archived',
      name: 'Retired Member',
      status: 'archived',
      archivedAt: '2026-02-01T00:00:00.000Z',
    })
    const groceries = [
      makeItem({ id: 'g-1', paidByMemberId: 'm-archived', sharedByMemberIds: ['m-archived'] }),
    ]

    const entries = buildHistoryEntries(groceries, [archived])

    expect(entries[0].paidByName).toBe('Retired Member')
    expect(entries[0].sharedByNames).toEqual(['Retired Member'])
  })

  it('falls back to "Unknown member" for a truly orphaned id rather than a blank or a guess', () => {
    const groceries = [makeItem({ id: 'g-1', paidByMemberId: 'ghost-id', sharedByMemberIds: ['ghost-id'] })]
    const entries = buildHistoryEntries(groceries, [])
    expect(entries[0].paidByName).toBe('Unknown member')
    expect(entries[0].sharedByNames).toEqual(['Unknown member'])
  })

  it('never merges two different members who happen to share a display name', () => {
    const members = [makeMember({ id: 'm-1', name: 'Sam' }), makeMember({ id: 'm-2', name: 'Sam' })]
    const groceries = [
      makeItem({ id: 'g-1', paidByMemberId: 'm-1' }),
      makeItem({ id: 'g-2', paidByMemberId: 'm-2' }),
    ]

    const entries = buildHistoryEntries(groceries, members)

    expect(entries[0].paidByMemberId).toBe('m-1')
    expect(entries[1].paidByMemberId).toBe('m-2')
    // Both display as "Sam" — that's expected — but identity stays on the id, never the name.
    expect(entries[0].paidByName).toBe('Sam')
    expect(entries[1].paidByName).toBe('Sam')
  })

  it('groups by real calendar month/year derived from createdAt (UTC)', () => {
    const groceries = [makeItem({ id: 'g-1', createdAt: '2026-07-15T23:30:00.000Z' })]
    const entries = buildHistoryEntries(groceries, [])
    expect(entries[0].monthLabel).toBe('July 2026')
  })
})
