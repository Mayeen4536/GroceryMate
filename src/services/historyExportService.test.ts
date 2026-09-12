import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroceryHistoryEntry } from '@/types/history'

const downloadTextFile = vi.fn()
vi.mock('@/services/downloadTextFile', () => ({ downloadTextFile: (...args: unknown[]) => downloadTextFile(...args) }))

const { exportEntry, exportEntries } = await import('./historyExportService')

function makeEntry(overrides: Partial<GroceryHistoryEntry> & { id: string }): GroceryHistoryEntry {
  return {
    name: 'Milk',
    category: 'dairy',
    amount: '240',
    notes: '',
    createdAt: '2026-03-05T00:00:00.000Z',
    day: '05',
    monthShort: 'Mar',
    dateLabel: 'Thursday, Mar 5',
    monthLabel: 'March 2026',
    paidByMemberId: 'm-1',
    paidByName: 'Aisha',
    sharedByMemberIds: ['m-1', 'm-2'],
    sharedByNames: ['Aisha', 'Bilal'],
    ...overrides,
  }
}

beforeEach(() => {
  downloadTextFile.mockClear()
})

describe('exportEntry', () => {
  it('includes the real entry values — name, amount, payer, sharers', () => {
    exportEntry(makeEntry({ id: 'g-1' }))

    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('Milk')
    expect(content).toContain('Aisha')
    expect(content).toContain('Bilal')
  })

  it('formats the money value rather than printing the raw amount string', () => {
    exportEntry(makeEntry({ id: 'g-1', amount: '1234.5' }))
    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toMatch(/1,234\.50|1234\.50/)
  })

  it('derives the filename from the real created date and name, never a generic placeholder', () => {
    exportEntry(makeEntry({ id: 'g-1', name: 'Brown Bread', createdAt: '2026-03-05T00:00:00.000Z' }))
    const [filename] = downloadTextFile.mock.calls[0]
    expect(filename).toContain('2026-03-05')
    expect(filename).toContain('brown-bread')
  })
})

describe('exportEntries', () => {
  it('combines every real entry passed in, and none that were not', () => {
    exportEntries([makeEntry({ id: 'g-1', name: 'Milk' }), makeEntry({ id: 'g-2', name: 'Rice' })])
    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toContain('Milk')
    expect(content).toContain('Rice')
  })

  it('never fabricates an entry when given an empty list', () => {
    exportEntries([])
    const [, content] = downloadTextFile.mock.calls[0]
    expect(content).toBe('')
  })
})
