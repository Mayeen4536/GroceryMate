import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Receipt, ScanSearch, ShoppingBasket, Users, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springPop, transitionBase } from '../../lib/motion'

interface Step {
  label: string
  icon: LucideIcon
}

const STEPS: Step[] = [
  { label: 'Reading receipt…', icon: Receipt },
  { label: 'Detecting items…', icon: ScanSearch },
  { label: 'Understanding household…', icon: Users },
  { label: 'Preparing groceries…', icon: ShoppingBasket },
]

const STEP_DURATION = 820
const DONE_HOLD = 550

/**
 * The generation sequence: each step lights up, completes with a check,
 * and hands off to the next. Self-contained - advances on its own timers
 * and calls `onComplete` once the "Done" beat has held for a moment.
 */
export function GeneratingSteps({ onComplete }: { onComplete: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const allDone = activeIndex >= STEPS.length

  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (allDone) {
          onComplete()
          return
        }
        setActiveIndex((index) => index + 1)
      },
      allDone ? DONE_HOLD : STEP_DURATION,
    )
    return () => clearTimeout(timer)
  }, [activeIndex, allDone, onComplete])

  return (
    <div role="status" aria-live="polite" className="mx-auto flex max-w-sm flex-col py-4">
      {STEPS.map((step, index) => {
        const isDone = index < activeIndex || allDone
        const isActive = index === activeIndex && !allDone
        const Icon = step.icon
        return (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <motion.span
                animate={isDone ? { scale: [1, 1.15, 1] } : {}}
                transition={springPop}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-300',
                  isDone
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : isActive
                      ? 'bg-brand-50 text-brand-700 ring-brand-300'
                      : 'bg-sand text-muted ring-line',
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDone ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={springPop}
                    >
                      <Check size={15} aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="icon"
                      animate={isActive ? { scale: [1, 1.12, 1] } : {}}
                      transition={{
                        duration: 1.1,
                        repeat: isActive ? Infinity : 0,
                        ease: 'easeInOut',
                      }}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
              {index < STEPS.length - 1 && (
                <span className="relative my-0.5 h-6 w-px overflow-hidden bg-line">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 origin-top bg-brand-500"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: index < activeIndex || allDone ? 1 : 0 }}
                    transition={transitionBase}
                    style={{ height: '100%' }}
                  />
                </span>
              )}
            </div>
            <p
              className={cn(
                'pt-1.5 pb-4 text-sm transition-colors duration-300',
                isDone ? 'text-ink-soft' : isActive ? 'font-medium text-ink' : 'text-muted',
              )}
            >
              {step.label}
            </p>
          </div>
        )
      })}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionBase}
            className="flex items-center gap-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white ring-1 ring-brand-600">
              <Check size={15} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-brand-700">Done.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
