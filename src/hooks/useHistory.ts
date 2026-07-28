import { useState } from 'react'
import { initialHistory } from '@/store/history'
import { exportSession, exportSessions } from '@/services/historyExportService'
import type { HistorySession } from '@/types/history'

export type HistoryStatusFilter = 'all' | 'settled' | 'pending'

/** Groups sessions by `monthLabel`, preserving the order they already appear in. */
function groupByMonth(sessions: HistorySession[]): Array<[string, HistorySession[]]> {
  const groups = new Map<string, HistorySession[]>()
  for (const session of sessions) {
    const bucket = groups.get(session.monthLabel)
    if (bucket) bucket.push(session)
    else groups.set(session.monthLabel, [session])
  }
  return [...groups.entries()]
}

/** Owns the History feature's state: sessions, search/status/month filters, and the preview drawer. */
export function useHistory() {
  const [sessions] = useState<HistorySession[]>(initialHistory)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const previewSession = sessions.find((session) => session.id === previewId) ?? null

  const monthOptions = [
    { value: 'all', label: 'All months' },
    ...[...new Set(sessions.map((session) => session.monthLabel))].map((month) => ({
      value: month,
      label: month,
    })),
  ]

  const query = search.trim().toLowerCase()
  const filtered = sessions.filter((session) => {
    const matchesQuery =
      !query ||
      session.title.toLowerCase().includes(query) ||
      session.members.some((name) => name.toLowerCase().includes(query)) ||
      session.items.some((item) => item.name.toLowerCase().includes(query))
    const matchesStatus = statusFilter === 'all' || session.settlement === statusFilter
    const matchesMonth = monthFilter === 'all' || session.monthLabel === monthFilter
    return matchesQuery && matchesStatus && matchesMonth
  })

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setMonthFilter('all')
  }

  const groups = groupByMonth(filtered)

  return {
    sessions,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    monthFilter,
    setMonthFilter,
    previewSession,
    setPreviewId,
    monthOptions,
    filtered,
    groups,
    clearFilters,
    exportSession,
    exportSessions,
  }
}
