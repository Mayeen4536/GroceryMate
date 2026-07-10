import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type HeadingLevel = 1 | 2 | 3

export interface SectionHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Slot for actions (usually a Button) aligned to the end. */
  action?: ReactNode
  /** Semantic heading level; also scales the title. */
  level?: HeadingLevel
  className?: string
}

const titleClasses: Record<HeadingLevel, string> = {
  1: 'text-2xl font-bold tracking-tight sm:text-3xl',
  2: 'text-xl font-semibold tracking-tight',
  3: 'text-base font-semibold',
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
  level = 2,
  className,
}: SectionHeaderProps) {
  const Heading = `h${level}` as const
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"
          >
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <Heading className={cn('text-ink', titleClasses[level])}>{title}</Heading>
          {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
