import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'brand' | 'mint' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends ComponentProps<'span'> {
  tone?: BadgeTone
  icon?: LucideIcon
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-sand text-ink-soft',
  brand: 'bg-brand-100 text-brand-800',
  mint: 'bg-mint-100 text-mint-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
}

export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  )
}
