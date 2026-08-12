import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { transitionFast } from '@/animations/motion'

/**
 * A per-mark hover/focus tooltip. The mark itself is the hit target (no
 * crosshair needed for bars) — render this as a child of a `relative`
 * element and toggle `active` from that element's own hover/focus state.
 * Enhances only: every value it shows must also be direct-labeled or in
 * the chart's table-view twin, never gated behind hovering.
 */
export function BarTooltip({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={transitionFast}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-canvas shadow-panel-hover"
        >
          {children}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
