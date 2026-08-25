import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { springPanel } from '@/animations/motion'

export interface ToastProps {
  message: string
  /** Label for the optional action button (e.g. "Undo"). */
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
}

/**
 * A single transient notification: a message, an optional action, and a
 * dismiss button. Renders one row — stack several in a fixed-position
 * container (with its own `AnimatePresence`) for multiple at once.
 * `role="status"` + `aria-live="polite"` so screen readers announce it
 * without stealing focus from whatever the user was doing.
 */
export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: springPanel }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex w-fit max-w-sm items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-lifted"
    >
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded font-semibold text-mint-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-200/60"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  )
}
