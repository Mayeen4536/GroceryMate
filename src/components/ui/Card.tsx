import { motion, type HTMLMotionProps } from 'framer-motion'
import type { KeyboardEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springGentle } from '../../lib/motion'

type CardVariant = 'default' | 'interactive' | 'highlighted'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'
export type CardAccent = 'neutral' | 'brand' | 'mint' | 'violet' | 'gold' | 'sky' | 'rose'

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode
  variant?: CardVariant
  padding?: CardPadding
  /** Tints the icon tile and adds a whisper of color in one corner. */
  accent?: CardAccent
  /** Optional header iconography, rendered in a gradient gem tile. */
  icon?: LucideIcon
  /** Optional header title (premium tracking, semibold). */
  title?: string
  /** Muted line under the title. */
  subtitle?: string
}

const variantClasses: Record<CardVariant, string> = {
  default: 'card-surface shadow-panel transition-shadow duration-300 hover:shadow-panel-hover',
  interactive: cn(
    'card-surface shadow-panel cursor-pointer',
    'transition-shadow duration-200 hover:shadow-panel-hover',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  ),
  highlighted:
    'card-surface-mint shadow-panel transition-shadow duration-300 hover:shadow-panel-hover',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const accentStyles: Record<CardAccent, { tile: string; glow: string }> = {
  neutral: { tile: 'from-sand to-surface text-ink-soft', glow: 'bg-ink/[0.04]' },
  brand: { tile: 'from-brand-100 to-mint-100 text-brand-700', glow: 'bg-brand-500/10' },
  mint: { tile: 'from-mint-100 to-mint-50 text-mint-700', glow: 'bg-brand-400/10' },
  violet: {
    tile: 'from-member-violet-soft to-member-sky-soft text-member-violet-strong',
    glow: 'bg-member-violet-strong/10',
  },
  gold: {
    tile: 'from-member-gold-soft to-warning-50 text-member-gold-strong',
    glow: 'bg-warning-500/12',
  },
  sky: {
    tile: 'from-member-sky-soft to-mint-50 text-member-sky-strong',
    glow: 'bg-member-sky-strong/10',
  },
  rose: {
    tile: 'from-member-rose-soft to-member-coral-soft text-member-rose-strong',
    glow: 'bg-member-rose-strong/10',
  },
}

export function Card({
  variant = 'default',
  padding = 'md',
  accent,
  icon: Icon,
  title,
  subtitle,
  onClick,
  onKeyDown,
  className,
  children,
  ...rest
}: CardProps) {
  // Clickable cards get button semantics and keyboard activation.
  const clickable = variant === 'interactive' && onClick != null
  const accentStyle = accent ? accentStyles[accent] : undefined
  const hasHeader = Boolean(title || Icon)

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.currentTarget.click()
    }
  }

  return (
    <motion.div
      whileHover={variant === 'interactive' ? { y: -3 } : undefined}
      whileTap={clickable ? { scale: 0.985 } : undefined}
      transition={springGentle}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? handleKeyDown : onKeyDown}
      className={cn(
        'relative rounded-xl',
        variantClasses[variant],
        accentStyle && 'overflow-hidden',
        paddingClasses[padding],
        className,
      )}
      {...rest}
    >
      {accentStyle && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -right-10 -top-12 size-36 rounded-full blur-2xl',
            accentStyle.glow,
          )}
        />
      )}
      {hasHeader && (
        <div className={cn('flex items-center gap-3', children != null && 'mb-4')}>
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br shadow-soft ring-1 ring-ink/5',
                (accentStyle ?? accentStyles.brand).tile,
              )}
            >
              <Icon size={19} />
            </span>
          )}
          <div className="min-w-0">
            {title && (
              <h3 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-0.5 text-[0.8125rem] text-muted">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  )
}
