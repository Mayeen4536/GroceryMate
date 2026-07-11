import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { cn } from '../../lib/cn'
import { easeSoft } from '../../lib/motion'

export interface AnimatedNumberProps {
  value: number
  /** Formats the displayed value; defaults to a rounded locale string. */
  format?: (value: number) => string
  className?: string
}

const defaultFormat = (value: number) => Math.round(value).toLocaleString()

/** Counts smoothly toward `value` whenever it changes. Uses tabular digits. */
export function AnimatedNumber({ value, format = defaultFormat, className }: AnimatedNumberProps) {
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
