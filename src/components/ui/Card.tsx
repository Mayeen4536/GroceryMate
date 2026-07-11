import { motion, type HTMLMotionProps } from 'framer-motion'
import type { KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { springGentle } from '../../lib/motion'

type CardVariant = 'default' | 'interactive' | 'highlighted'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: CardVariant
  padding?: CardPadding
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface shadow-card',
  interactive: cn(
    'bg-surface shadow-card cursor-pointer',
    'transition-shadow duration-200 hover:shadow-lifted',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  ),
  highlighted: 'bg-linear-to-b from-mint-50 to-surface shadow-card ring-1 ring-brand-600/10',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({
  variant = 'default',
  padding = 'md',
  onClick,
  onKeyDown,
  className,
  children,
  ...rest
}: CardProps) {
  // Clickable cards get button semantics and keyboard activation.
  const clickable = variant === 'interactive' && onClick != null

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
      className={cn('rounded-xl', variantClasses[variant], paddingClasses[padding], className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
