import { AnimatePresence, motion } from 'framer-motion'
import { HandCoins } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useSettlements } from '@/hooks/useSettlements'
import { JourneyCard } from './JourneyCard'
import { SummaryCard } from './SummaryCard'
import { Timeline } from './Timeline'
import { AllSettled } from './AllSettled'

interface SettlementsPageProps {
  direction?: number
  onAddGroceries: () => void
}

/** The Settlement experience. All state is visual mock state; no calculations. */
export function SettlementsPage({ direction = 1, onAddGroceries }: SettlementsPageProps) {
  const { pending, timeline, allSettled, markPaid } = useSettlements()

  return (
    <PageTransition direction={direction}>
      <motion.div variants={riseChild}>
        <PageHeader
          title="Settlements"
          description="Who owes whom, and the simplest way to settle up."
          action={
            !allSettled ? (
              <Badge tone="warning" icon={HandCoins}>
                {pending.length} pending
              </Badge>
            ) : (
              <Badge tone="success" icon={HandCoins}>
                All square
              </Badge>
            )
          }
        />
      </motion.div>

      <div className="space-y-6">
        {allSettled ? (
          <motion.div
            key="all-settled"
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={transitionBase}
          >
            <AllSettled onAddGroceries={onAddGroceries} />
          </motion.div>
        ) : (
          <>
            <motion.div variants={riseChild}>
              <SummaryCard pendingCount={pending.length} />
            </motion.div>

            <motion.div variants={riseChild}>
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
          </>
        )}

        <motion.div variants={riseChild}>
          <Timeline events={timeline} />
        </motion.div>
      </div>
    </PageTransition>
  )
}
