import { useMemo, useState } from 'react'
import { buildHistoryEntries } from '@/features/history/buildHistoryEntries'
import { exportEntries, exportEntry } from '@/services/historyExportService'
import type { GroceryItem } from '@/types/grocery'
import type { GroceryHistoryEntry } from '@/types/history'
import type { Member } from '@/types/member'

/** Groups entries by `monthLabel`, preserving whatever order they already arrive in (newest-first). */
function groupByMonth(entries: GroceryHistoryEntry[]): Array<[string, GroceryHistoryEntry[]]> {
  const groups = new Map<string, GroceryHistoryEntry[]>()
  for (const entry of entries) {
    const bucket = groups.get(entry.monthLabel)
    if (bucket) bucket.push(entry)
    else groups.set(entry.monthLabel, [entry])
  }
  return [...groups.entries()]
}

/**
 * Owns the History feature's state: real grocery activity (derived from
 * the *same* already-loaded `groceries`/`members` every other page uses —
 * no second query, no second financial source of truth), plus
 * search/month filters and the preview drawer. There is no settlement-
 * status filter any more — an individual grocery entry has no truthful
 * per-item "settled/pending" state of its own (that's a household-wide
 * concept, already shown for real on the Settlements page).
 */
export function useHistory(groceries: readonly GroceryItem[], members: readonly Member[]) {
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [previewId, setPreviewId] = useState<string | null>(null)

  // Reflects the exact same list Groceries/Members show — including
  // exclusion of anything still in its optimistic-delete undo window
  // (see docs/GROCERY_INTEGRATION.md) — so History never shows an item
  // that looks "gone" everywhere else in the app.
  const entries = useMemo(() => buildHistoryEntries(groceries, members), [groceries, members])

  const previewEntry = entries.find((entry) => entry.id === previewId) ?? null

  const monthOptions = [
    { value: 'all', label: 'All months' },
    ...[...new Set(entries.map((entry) => entry.monthLabel))].map((month) => ({
      value: month,
      label: month,
    })),
  ]

  const query = search.trim().toLowerCase()
  const filtered = entries.filter((entry) => {
    const matchesQuery =
      !query ||
      entry.name.toLowerCase().includes(query) ||
      entry.paidByName.toLowerCase().includes(query) ||
      entry.sharedByNames.some((name) => name.toLowerCase().includes(query)) ||
      entry.notes.toLowerCase().includes(query)
    const matchesMonth = monthFilter === 'all' || entry.monthLabel === monthFilter
    return matchesQuery && matchesMonth
  })

  const clearFilters = () => {
    setSearch('')
    setMonthFilter('all')
  }

  const groups = groupByMonth(filtered)

  return {
    entries,
    search,
    setSearch,
    monthFilter,
    setMonthFilter,
    previewEntry,
    setPreviewId,
    monthOptions,
    filtered,
    groups,
    clearFilters,
    exportEntry,
    exportEntries,
  }
}
