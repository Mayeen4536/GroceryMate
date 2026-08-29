import { AnimatePresence, motion } from 'framer-motion'
import { HandCoins } from 'lucide-react'
import { Badge } from '@/components/ui'
import { FinancialDataError } from '@/components/FinancialDataError'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useSettlementResult } from '@/hooks/useSettlementResult'
import { useSettlements } from '@/hooks/useSettlements'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import type { Settlement } from '@/types/settlement'
import { JourneyCard } from './JourneyCard'
import { SummaryCard } from './SummaryCard'
import { Timeline } from './Timeline'
import { AllSettled } from './AllSettled'

interface SettlementsPageProps {
  direction?: number
  onAddGroceries: () => void
  members: readonly Member[]
  groceries: readonly GroceryItem[]
}

const NO_TRANSFERS: readonly Settlement[] = []

/** The Settlement experience: balances and payments derived from the real settlement engine. */
export function SettlementsPage({ direction = 1, onAddGroceries, members, groceries }: SettlementsPageProps) {
  const settlementResult = useSettlementResult(members, groceries)
  const transfers = settlementResult.status === 'ok' ? settlementResult.viewModel.transfers : NO_TRANSFERS
  const { pending, timeline, allSettled, markPaid } = useSettlements(transfers)

  return (
    <PageTransition direction={direction}>
      <motion.div variants={riseChild}>
        <PageHeader
          title="Settlements"
          description="Who owes whom, and the simplest way to settle up."
          action={
            settlementResult.status !== 'ok' ? undefined : allSettled ? (
              <Badge tone="success" icon={HandCoins}>
                All square
              </Badge>
            ) : (
              <Badge tone="warning" icon={HandCoins}>
                {pending.length} pending
              </Badge>
            )
          }
        />
      </motion.div>

      {settlementResult.status === 'error' ? (
        <motion.div variants={riseChild}>
          <FinancialDataError message={settlementResult.userMessage} />
        </motion.div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="wait" initial={false}>
            {allSettled ? (
              <motion.div
                key="all-settled"
                initial={{ opacity: 0, y: 14, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={transitionBase}
              >
                <AllSettled onAddGroceries={onAddGroceries} />
              </motion.div>
            ) : (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 14, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={transitionBase}
                className="space-y-6"
              >
                <SummaryCard pendingCount={pending.length} summary={settlementResult.viewModel.summary} />

                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {pending.map((settlement) => (
                      <motion.li
                        key={settlement.id}
                        layout
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        transition={transitionBase}
                      >
                        <JourneyCard settlement={settlement} onPaid={markPaid} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={riseChild}>
            <Timeline events={timeline} />
          </motion.div>
        </div>
      )}
    </PageTransition>
  )
}
