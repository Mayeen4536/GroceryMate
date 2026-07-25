import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { springPop, springSnappy } from '../../lib/motion'
import { ACCENT_OPTIONS } from '../../data/settings'

interface ThemeAccentPickerProps {
  value: string
  onChange: (id: string) => void
}

/** Accent color swatches for the app theme. The selection ring slides between dots. */
export function ThemeAccentPicker({ value, onChange }: ThemeAccentPickerProps) {
  const id = useId()
  return (
    <div className="flex flex-wrap gap-2.5">
      {ACCENT_OPTIONS.map((option) => {
        const selected = option.id === value
        return (
          <motion.button
            key={option.id}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            title={option.label}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            transition={springSnappy}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative flex size-8 items-center justify-center rounded-full text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              option.dot,
            )}
          >
            {selected && (
              <motion.span
                layoutId={`theme-accent-ring-${id}`}
                transition={springSnappy}
                aria-hidden="true"
                className="absolute -inset-1 rounded-full border-2 border-ink/60"
              />
            )}
            <AnimatePresence>
              {selected && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={springPop}
                >
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}
