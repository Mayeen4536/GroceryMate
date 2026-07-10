import { Leaf } from 'lucide-react'

/** GroceryMate logo mark and wordmark, with an optional subtle tagline. */
export function Brand({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
        <Leaf size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-bold leading-tight tracking-tight text-ink">
          GroceryMate
        </p>
        {withTagline && (
          <p className="truncate text-[0.6875rem] leading-tight text-muted">
            Split groceries fairly.
          </p>
        )}
      </div>
    </div>
  )
}
