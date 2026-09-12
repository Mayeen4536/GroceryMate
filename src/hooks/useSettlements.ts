import { useState } from 'react'
import { formatTaka } from '@/utils/currency'
import { firstName } from '@/utils/name'
import type { Settlement, TimelineEvent } from '@/types/settlement'

/**
 * Owns the Settlements feature's session-local state on top of the real,
 * engine-derived `transfers` it's handed (see `useSettlementResult` — the
 * one source of financial truth; this hook never computes a balance
 * itself). Two things live here, deliberately not treated the same way:
 *
 * - `timeline`: starts empty — there is no persisted payment history yet
 *   (see docs/HISTORY_INTEGRATION.md's settlement-timeline note), so
 *   nothing is fabricated to fill it. Every entry it ever holds is a real
 *   "Mark as paid" dismissal from *this* browser session (see below); the
 *   feed itself is never persisted or restored on refresh.
 * - `dismissedIds`: which real transfers "Mark as paid" has hidden for
 *   this browser session. NOT a record of an actual payment — nothing is
 *   persisted, and the underlying balance is recomputed in full, for
 *   real, on every render regardless. Refreshing the page (or the
 *   household's data changing) brings a still-real debt right back. This
 *   is a deliberate product decision: recording a real payment would need
 *   a new domain concept (see docs) that doesn't exist yet, and pretending
 *   this dismissal is that would misrepresent the household's actual
 *   balance — worse than the interaction staying visibly provisional.
 */
export function useSettlements(transfers: readonly Settlement[]) {
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set())
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])

  const pending = transfers.filter((entry) => !dismissedIds.has(entry.id))
  // Deliberately NOT `pending.length === 0`: whether the household is
  // actually settled up is a real-financial-truth question, and dismissing
  // a card from view must never be able to trigger the "Everyone's
  // square!" celebration on its own if a real, undismissed debt remains.
  const allSettled = transfers.length === 0

  const markPaid = (id: string) => {
    const settlement = pending.find((entry) => entry.id === id)
    if (!settlement) return
    setDismissedIds((current) => new Set(current).add(id))
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
