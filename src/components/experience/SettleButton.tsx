import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, HandCoins } from 'lucide-react'
import { cn } from '../../lib/cn'
import { transitionFast } from '../../lib/motion'
import { Celebration } from './Celebration'

type SettleState = 'idle' | 'working' | 'done'

export interface SettleButtonProps {
  idleLabel?: string
  workingLabel?: string
  doneLabel?: string
  /** Fires ~1.3s after success lands, once the confetti has cleared. */
  onComplete?: () => void
  className?: string
}

/**
 * The settling-up interaction: the button morphs through the work
 * (idle -> settling -> settled) and fires the settlement confetti on
 * success. Remount (change key) to reset.
 */
export function SettleButton({
  idleLabel = 'Mark as paid',
  workingLabel = 'Settling',
  doneLabel = 'Paid',
  onComplete,
  className,
}: SettleButtonProps) {
  const [state, setState] = useState<SettleState>('idle')
  const [celebrate, setCelebrate] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer))
    },
    [],
  )

  const start = () => {
    if (state !== 'idle') return
    setState('working')
    timers.current.push(
      window.setTimeout(() => {
        setState('done')
        setCelebrate((count) => count + 1)
      }, 1200),
    )
    if (onComplete) {
      timers.current.push(window.setTimeout(onComplete, 2500))
    }
  }

  return (
    <div className={cn('relative flex justify-center', className)}>
      <Celebration trigger={celebrate} />
      <motion.button
        layout
        type="button"
        onClick={start}
        className={cn(
          'relative flex h-11 items-center justify-center overflow-hidden rounded-md px-5 text-sm font-semibold text-white',
          'transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          state === 'done'
            ? 'bg-linear-to-b from-success-500 to-success-700 shadow-button-brand'
            : 'bg-linear-to-b from-brand-500 to-brand-700 shadow-button-brand',
          state === 'working' && 'cursor-wait',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={transitionFast}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {state === 'idle' && (
              <>
                <HandCoins size={17} aria-hidden="true" />
                {idleLabel}
              </>
            )}
            {state === 'working' && (
              <>
                {workingLabel}
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    className="size-1 rounded-full bg-white"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, delay: index * 0.18, repeat: Infinity }}
                  />
                ))}
              </>
            )}
            {state === 'done' && (
              <>
                <Check size={17} aria-hidden="true" />
                {doneLabel}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
