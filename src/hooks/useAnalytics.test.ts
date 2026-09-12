import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAnalytics } from './useAnalytics'
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

describe('useAnalytics', () => {
  it('reports an honest empty state — no fabricated data — when there are no real groceries', () => {
    const { result } = renderHook(() => useAnalytics([], []))

    expect(result.current.monthlySpend).toEqual([])
    expect(result.current.topGroceries).toEqual([])
    expect(result.current.categoryBreakdown).toEqual([])
    expect(result.current.memberContribution).toEqual([])
    expect(result.current.summary).toMatchObject({
      totalSpend: 0,
      totalItems: 0,
      topCategory: null,
      topSpender: null,
    })
  })

  it('derives real category totals from the actual persisted groceries', () => {
    const groceries = [
      makeItem({ id: 'g-1', category: 'dairy', price: '100' }),
      makeItem({ id: 'g-2', category: 'dairy', price: '50' }),
      makeItem({ id: 'g-3', category: 'produce', price: '25' }),
    ]

    const { result } = renderHook(() => useAnalytics(groceries, []))

    const dairy = result.current.categoryBreakdown.find((entry) => entry.category === 'dairy')
    const produce = result.current.categoryBreakdown.find((entry) => entry.category === 'produce')
    expect(dairy?.total).toBe(150)
    expect(produce?.total).toBe(25)
  })

  it('derives real payer contribution totals keyed by member id, and never merges two members who share a display name', () => {
    const members = [makeMember({ id: 'm-1', name: 'Sam' }), makeMember({ id: 'm-2', name: 'Sam' })]
    const groceries = [
      makeItem({ id: 'g-1', paidByMemberId: 'm-1', price: '300' }),
      makeItem({ id: 'g-2', paidByMemberId: 'm-2', price: '100' }),
    ]

    const { result } = renderHook(() => useAnalytics(groceries, members))

    const m1 = result.current.memberContribution.find((entry) => entry.memberId === 'm-1')
    const m2 = result.current.memberContribution.find((entry) => entry.memberId === 'm-2')
    expect(m1?.total).toBe(300)
    expect(m2?.total).toBe(100)
    expect(result.current.summary.topSpender).toEqual({ name: 'Sam', total: 300 })
  })

  it('splits personal (single sharer) vs shared (multiple sharers) spend by member id', () => {
    const members = [makeMember({ id: 'm-1', name: 'A' }), makeMember({ id: 'm-2', name: 'B' })]
    const groceries = [
      makeItem({ id: 'g-1', price: '100', sharedByMemberIds: ['m-1'] }),
      makeItem({ id: 'g-2', price: '200', sharedByMemberIds: ['m-1', 'm-2'] }),
    ]

    const { result } = renderHook(() => useAnalytics(groceries, members))

    const m1 = result.current.memberPersonalShared.find((entry) => entry.memberId === 'm-1')
    expect(m1?.personal).toBe(100)
    expect(m1?.shared).toBe(100)
    expect(m1?.total).toBe(200)
  })

  it('handles decimal money precision without drift', () => {
    const groceries = [makeItem({ id: 'g-1', price: '19.99' }), makeItem({ id: 'g-2', price: '0.01' })]
    const { result } = renderHook(() => useAnalytics(groceries, []))
    expect(result.current.summary.totalSpend).toBeCloseTo(20, 5)
  })

  it('groups monthly spend by the real createdAt month, not a fabricated sort key', () => {
    const groceries = [
      makeItem({ id: 'g-1', createdAt: '2026-01-15T00:00:00.000Z', price: '100' }),
      makeItem({ id: 'g-2', createdAt: '2026-02-01T00:00:00.000Z', price: '50' }),
    ]

    const { result } = renderHook(() => useAnalytics(groceries, []))

    expect(result.current.monthlySpend).toEqual([
      { monthLabel: 'January 2026', total: 100 },
      { monthLabel: 'February 2026', total: 50 },
    ])
  })
})
