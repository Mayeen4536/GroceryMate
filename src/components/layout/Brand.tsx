import { Leaf } from 'lucide-react'
import { cn } from '../../lib/cn'

interface BrandProps {
  withTagline?: boolean
  /** 'dark' renders light text for pine surfaces. */
  tone?: 'light' | 'dark'
}

/** GroceryMate logo mark and wordmark, with an optional subtle tagline. */
export function Brand({ withTagline = false, tone = 'light' }: BrandProps) {
  const dark = tone === 'dark'
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg text-white',
          'bg-linear-to-b from-brand-500 to-brand-700 shadow-button-brand',
          dark && 'ring-1 ring-white/15',
        )}
      >
        <Leaf size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-[0.9375rem] font-bold leading-tight tracking-tight',
            dark ? 'text-pine-text' : 'text-ink',
          )}
        >
          GroceryMate
        </p>
        {withTagline && (
          <p
            className={cn(
              'truncate text-[0.6875rem] leading-tight',
              dark ? 'text-pine-muted' : 'text-muted',
            )}
          >
            Split groceries fairly.
          </p>
        )}
      </div>
    </div>
  )
}
