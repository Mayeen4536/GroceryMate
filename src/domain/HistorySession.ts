import type { GroceryItemId, HistorySessionId, HouseholdId, MemberId } from './ids'

/** A session whose shopping is still being logged. */
export interface InProgressSession {
  readonly status: 'in_progress'
}

/** A session whose shopping has finished being logged. */
export interface CompletedSession {
  readonly status: 'completed'
  readonly completedAt: Date
}

/**
 * A single grocery run, grouping the items bought together for shared
 * reference later. Responsibility: which items and members belong to one
 * trip, and whether logging is still underway. It does not carry
 * settlement or payment status — that's tracked per-debt on Settlement,
 * not duplicated per-session here.
 */
export type HistorySession = {
  readonly id: HistorySessionId
  readonly householdId: HouseholdId
  readonly title: string
  readonly memberIds: readonly MemberId[]
  readonly groceryItemIds: readonly GroceryItemId[]
  readonly startedAt: Date
  /** Not every session has a note, so this stays genuinely optional. */
  readonly notes?: string
} & (InProgressSession | CompletedSession)
