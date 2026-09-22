import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedNumber, Avatar } from '@/components/ui'
import { FlowDots } from './FlowDots'

/**
 * Money-flow visualization: dots travel from debtor to creditor while the
 * amount counts up when it scrolls into view. Ambient by design.
 */
export function SettlementFlow() {
  const [inView, setInView] = useState(false)

  return (
    <motion.div
      onViewportEnter={() => setInView(true)}
      viewport={{ once: true, margin: '-40px' }}
      className="flex w-full flex-col items-center gap-4"
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name="Bilal Ahmed" />
          <span className="text-xs text-muted">Bilal</span>
        </div>
        <div className="relative h-10 flex-1">
          <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
          <FlowDots
            axis="x"
            duration={1.8}
            staggerDelay={0.6}
            ease="easeInOut"
            size={6}
            colorClassName="bg-brand-500"
            crossAxisPosition="center"
            overshoot={0}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar name="Aisha Khan" />
          <span className="text-xs text-muted">Aisha</span>
        </div>
      </div>
      <p className="text-sm text-muted">
        Bilal owes Aisha <AnimatedNumber value={inView ? 410 : 0} className="font-semibold text-ink" />
      </p>
    </motion.div>
  )
}
