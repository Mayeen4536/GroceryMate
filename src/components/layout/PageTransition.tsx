import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageVariants } from '../../lib/motion'

interface PageTransitionProps {
  /** 1 = forward in the nav order, -1 = backward; sets the slide direction. */
  direction?: number
  className?: string
  children: ReactNode
}

/**
 * Standard page enter/exit wrapper. Render as the root of every page inside
 * an `AnimatePresence mode="wait"` that receives the same `custom` direction.
 * Direct children may use `riseChild` variants for a staggered reveal.
 */
export function PageTransition({ direction = 1, className, children }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      custom={direction}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  )
}
