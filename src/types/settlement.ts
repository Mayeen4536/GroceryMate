/**
 * Display-only settlement model — amounts stay strings, no math happens in
 * the UI layer. Real, engine-derived values (see `toSettlementViewModel`),
 * not mock data: `from`/`to` are resolved display names for a real transfer
 * the settlement engine computed from actual persisted groceries.
 */
export interface Settlement {
  id: string
  /** Debtor (pays). */
  from: string
  /** Creditor (receives). */
  to: string
  amount: string
}

/** The only kind of event `useSettlements` ever produces today (a real "Mark as paid" dismissal) — see docs/HISTORY_INTEGRATION.md's settlement-timeline note. */
export type TimelineKind = 'payment'

export interface TimelineEvent {
  id: string
  kind: TimelineKind
  title: string
  when: string
}
