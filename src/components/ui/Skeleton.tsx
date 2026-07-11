import { cn } from '../../lib/cn'

/**
 * Loading placeholder with a soft shimmer. Size it with className
 * (e.g. `h-3 w-1/2`, `size-10 rounded-full`).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer rounded-md motion-reduce:animate-none',
        'bg-[linear-gradient(90deg,var(--color-sand)_25%,rgb(255_255_255/0.85)_50%,var(--color-sand)_75%)] bg-[length:200%_100%]',
        className,
      )}
    />
  )
}
