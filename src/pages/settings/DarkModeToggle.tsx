import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springSnappy, transitionFast } from '../../lib/motion'

interface DarkModeToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

/** The flagship toggle: track tone and a sun/moon glyph morph together. */
export function DarkModeToggle({ checked, onChange }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle dark mode"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex h-8 w-14 shrink-0 items-center rounded-full p-1',
        'transition-colors duration-300 ease-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked ? 'bg-pine-950' : 'bg-warning-50 ring-1 ring-inset ring-line-strong',
      )}
    >
      <motion.span
        layout
        transition={springSnappy}
        className={cn(
          'flex size-6 items-center justify-center rounded-full shadow-[0_1px_3px_rgb(30_26_22/0.35)]',
          checked ? 'ml-auto bg-pine-800 text-pine-mint' : 'bg-white text-warning-500',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={checked ? 'moon' : 'sun'}
            initial={{ scale: 0.3, rotate: -70, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.3, rotate: 70, opacity: 0 }}
            transition={transitionFast}
          >
            {checked ? (
              <Moon size={13} aria-hidden="true" fill="currentColor" />
            ) : (
              <Sun size={13} aria-hidden="true" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  )
}
