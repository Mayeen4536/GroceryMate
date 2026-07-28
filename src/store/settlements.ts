import type { Settlement, TimelineEvent } from '@/types/settlement'

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
