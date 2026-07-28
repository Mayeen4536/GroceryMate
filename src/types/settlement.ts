/**
 * Display-only settlement model. All amounts are placeholder strings and
 * the summary values are hand-written mock data; no math happens in the
 * UI layer.
 */
export interface Settlement {
  id: string
  /** Debtor (pays). */
  from: string
  /** Creditor (receives). */
  to: string
  amount: string
}

export type TimelineKind = 'payment' | 'session' | 'square'

export interface TimelineEvent {
  id: string
  kind: TimelineKind
  title: string
  when: string
}
