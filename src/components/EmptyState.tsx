import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/utils/cn'

export interface EmptyStateOrbitChip {
  icon: LucideIcon
  /** Text color class for the chip's icon, e.g. 'text-danger-500'. */
  toneClassName: string
}

export interface EmptyStateProps {
  icon: LucideIcon
  /** Gradient + text color classes for the center tile, e.g. 'from-brand-100 to-mint-100 text-brand-700'. */
  tileClassName: string
  /** Background blur glow color, e.g. 'bg-brand-500/10'. */
  glowClassName: string
  /** Dashed rotating ring border color, e.g. 'border-brand-300/50'. */
  ringClassName: string
  /** Exactly three floating chips orbiting the center tile. */
  orbitChips: [EmptyStateOrbitChip, EmptyStateOrbitChip, EmptyStateOrbitChip]
  title: string
  description: string
  /** Optional call-to-action slot, e.g. a Button to add the first item. */
  action?: ReactNode
}

/** Fixed layout for the three orbit chips; only icon/tone vary per caller. */
const ORBIT_SLOTS = [
  { className: '-top-1 left-8', duration: 5.5, delay: 0 },
  { className: 'right-0 top-10', duration: 6.5, delay: 0.6 },
  { className: 'bottom-1 left-3', duration: 7.5, delay: 1.1 },
] as const

/** Shared "nothing here yet" illustration: floating center tile, orbiting chips, heading, and an optional CTA. */
export function EmptyState({
  icon: Icon,
  tileClassName,
  glowClassName,
  ringClassName,
  orbitChips,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card padding="none" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className={cn(
          'absolute -top-28 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full blur-3xl',
          glowClassName,
        )}
      />
      <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
        <div className="relative flex size-36 items-center justify-center">
          <motion.span
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className={cn('absolute inset-0 rounded-full border-2 border-dashed', ringClassName)}
          />
          <motion.span
            aria-hidden="true"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'flex size-16 items-center justify-center rounded-xl bg-linear-to-br shadow-card ring-1 ring-ink/5',
              tileClassName,
            )}
          >
            <Icon size={28} />
          </motion.span>
          {orbitChips.map((chip, index) => {
            const slot = ORBIT_SLOTS[index]
            return (
              <motion.span
                key={slot.className}
                aria-hidden="true"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: slot.duration, delay: slot.delay, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'absolute flex size-9 items-center justify-center rounded-lg bg-surface shadow-card ring-1 ring-ink/5',
                  slot.className,
                  chip.toneClassName,
                )}
              >
                <chip.icon size={16} />
              </motion.span>
            )
          })}
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mx-auto max-w-xs text-sm text-muted">{description}</p>
        </div>
        {action}
      </div>
    </Card>
  )
}
