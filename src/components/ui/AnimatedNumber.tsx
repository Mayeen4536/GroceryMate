import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { cn } from '@/utils/cn'
import { easeSoft } from '@/animations/motion'
import { formatAmount } from '@/utils/money'

export interface AnimatedNumberProps {
  value: number
  /** Formats the displayed value; defaults to the shared amount formatter (see `src/utils/money.ts`). */
  format?: (value: number) => string
  className?: string
}

/** Counts smoothly toward `value` whenever it changes. Uses tabular digits. */
export function AnimatedNumber({ value, format = formatAmount, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value)
  const previous = useRef(value)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    if (reducedMotion) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, { duration: 0.6, ease: easeSoft })
    return () => controls.stop()
  }, [value, motionValue, reducedMotion])

  const text = useTransform(motionValue, format)

  return <motion.span className={cn('tabular-nums', className)}>{text}</motion.span>
}
