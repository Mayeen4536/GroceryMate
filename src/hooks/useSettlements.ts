import { useState } from 'react'
import { initialSettlements, initialTimeline } from '@/store/settlements'
import { formatTaka } from '@/utils/currency'
import { firstName } from '@/utils/name'
import type { Settlement, TimelineEvent } from '@/types/settlement'

/** Owns the Settlements feature's state: pending payments and the timeline they feed into. */
export function useSettlements() {
  const [pending, setPending] = useState<Settlement[]>(initialSettlements)
  const [timeline, setTimeline] = useState<TimelineEvent[]>(initialTimeline)

  const allSettled = pending.length === 0

  const markPaid = (id: string) => {
    const settlement = pending.find((entry) => entry.id === id)
    if (!settlement) return
    setPending((current) => current.filter((entry) => entry.id !== id))
    setTimeline((current) => [
      {
        id: `t-${Date.now()}`,
        kind: 'payment',
        title: `${firstName(settlement.from)} paid ${firstName(settlement.to)} ${formatTaka(Number.parseFloat(settlement.amount) || 0)}`,
        when: 'Just now',
      },
      ...current,
    ])
  }

  return { pending, timeline, allSettled, markPaid }
}
