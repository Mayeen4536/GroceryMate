import type { CategoryId } from './grocery'

/**
 * One real, persisted grocery, reshaped for the History timeline. There is
 * no "shopping session"/"trip" concept in the schema (see
 * docs/HISTORY_INTEGRATION.md) — each entry is exactly one
 * `grocery_items` row, never a fabricated grouping of several. Amounts
 * stay strings on purpose: no math happens in the UI layer. Names
 * (`paidByName`/`sharedByNames`) are resolved for display only — identity
 * is always the underlying member id (see `GroceryHistoryEntry.paidByMemberId`
 * / `sharedByMemberIds`).
 */
export interface GroceryHistoryEntry {
  readonly id: string
  readonly name: string
  readonly category: CategoryId
  readonly amount: string
  readonly notes: string
  /** ISO timestamp this was actually logged — the real basis for every date label/grouping below. */
  readonly createdAt: string
  /** '24' */
  readonly day: string
  /** 'Jul' */
  readonly monthShort: string
  /** 'Friday, Jul 24' */
  readonly dateLabel: string
  /** 'July 2026' — grouping key for the timeline. */
  readonly monthLabel: string
  readonly paidByMemberId: string
  readonly paidByName: string
  readonly sharedByMemberIds: readonly string[]
  readonly sharedByNames: readonly string[]
}
