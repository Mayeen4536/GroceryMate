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

/** Display formatter for amounts; presentation only. */
export const formatTaka = (value: number) => `৳${Math.round(value).toLocaleString()}`

/** Pending payments between members. */
export const initialSettlements: Settlement[] = [
  { id: 's-1', from: 'Bilal Ahmed', to: 'Aisha Khan', amount: '420' },
  { id: 's-2', from: 'Daniyal Raza', to: 'Aisha Khan', amount: '260' },
  { id: 's-3', from: 'Daniyal Raza', to: 'Chloe Lee', amount: '145' },
]

/** Hand-written summary placeholders (consistent with the list above). */
export const summaryMock = {
  outstanding: '825',
  receivers: [
    { name: 'Aisha Khan', amount: '680' },
    { name: 'Chloe Lee', amount: '145' },
  ],
  owers: [
    { name: 'Bilal Ahmed', amount: '420' },
    { name: 'Daniyal Raza', amount: '405' },
  ],
}

export const initialTimeline: TimelineEvent[] = [
  { id: 't-1', kind: 'payment', title: 'Chloe paid Aisha ৳180', when: 'Monday' },
  { id: 't-2', kind: 'session', title: 'Weekly shop logged · 12 items', when: 'Sunday' },
  { id: 't-3', kind: 'payment', title: 'Bilal paid Chloe ৳95', when: 'Last week' },
  { id: 't-4', kind: 'square', title: 'Flat 4B settled up fully', when: 'Last month' },
]
