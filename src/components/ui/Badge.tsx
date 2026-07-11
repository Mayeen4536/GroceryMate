import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'

type BadgeTone = 'neutral' | 'brand' | 'mint' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  children?: ReactNode
  tone?: BadgeTone
  icon?: LucideIcon
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink/[0.05] text-ink-soft',
  brand: 'bg-brand-600/10 text-brand-800',
  mint: 'bg-mint-100 text-mint-700',
  success: 'bg-success-500/12 text-success-700',
  warning: 'bg-warning-500/15 text-warning-700',
  danger: 'bg-danger-500/10 text-danger-700',
}

export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }: BadgeProps) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      transition={springSnappy}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </motion.span>
  )
}
