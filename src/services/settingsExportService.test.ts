import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import type { Settlement } from '@/types/settlement'

const downloadTextFile = vi.fn()
vi.mock('@/services/downloadTextFile', () => ({
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}))

const { exportAllData } = await import('./settingsExportService')

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

beforeEach(() => {
  downloadTextFile.mockClear()
})

describe('exportAllData', () => {
  it('exports only the real household name, members, and groceries handed to it — never a fabricated default', () => {
    const members = [makeMember({ id: 'm-1', name: 'Real Member' })]
    const groceries = [makeItem({ id: 'g-1', name: 'Real Grocery', paidByMemberId: 'm-1' })]

    exportAllData({ householdId: 'h-1', householdName: 'Real Household', members, groceries, transfers: [] })

    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('Real Household')
    expect(content).toContain('Real Member')
    expect(content).toContain('Real Grocery')
    // The old mock fixture names must never leak into a real export.
    expect(content).not.toContain('Aisha Khan')
    expect(content).not.toContain('Bilal Ahmed')
  })

  it('honestly reports empty sections instead of fabricating placeholder rows', () => {
    exportAllData({
      householdId: 'h-1',
      householdName: 'Empty Household',
      members: [],
      groceries: [],
      transfers: [],
    })

    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('No members yet.')
    expect(content).toContain('No groceries logged yet.')
    expect(content).toContain('Everyone is settled up.')
    expect(content).toContain('No history yet.')
  })

  it('includes real settlement transfers when there are pending ones, resolved by real name', () => {
    const transfers: Settlement[] = [{ id: 's-1', from: 'Alice', to: 'Bob', amount: '250' }]
    exportAllData({ householdId: 'h-1', householdName: 'H', members: [], groceries: [], transfers })

    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('Alice owes Bob')
    expect(content).not.toContain('Everyone is settled up.')
  })

  it('resolves a grocery payer to "Unknown member" rather than a raw id when the member is missing', () => {
    const groceries = [makeItem({ id: 'g-1', paidByMemberId: 'missing-id' })]
    exportAllData({ householdId: 'h-1', householdName: 'H', members: [], groceries, transfers: [] })

    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('Unknown member')
  })
})
