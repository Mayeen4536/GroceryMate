import type { CategoryId } from './grocery'

/**
 * Display-only grocery history model. Amounts stay strings on purpose: no
 * math happens in the UI layer. `sortKey` is an ISO date used only to order
 * and group sessions, not for calculation.
 */
export type SessionStatus = 'completed' | 'in-progress'
export type SettlementStatus = 'settled' | 'pending'

export interface HistoryItem {
  name: string
  category: CategoryId
  price: string
  paidBy: string
}

export interface HistoryPayment {
  from: string
  to: string
  amount: string
}

export interface HistorySession {
  id: string
  title: string
  /** Day of month, e.g. '24'. */
  day: string
  /** Short month, e.g. 'Jul'. */
  monthShort: string
  /** Full display date, e.g. 'Friday, Jul 24'. */
  dateLabel: string
  /** Grouping key, e.g. 'July 2026'. */
  monthLabel: string
  /** ISO date used only for sort order. */
  sortKey: string
  members: string[]
  total: string
  status: SessionStatus
  settlement: SettlementStatus
  payments: HistoryPayment[]
  items: HistoryItem[]
  notes?: string
}
