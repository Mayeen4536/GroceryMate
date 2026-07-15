import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { MEMBER_TONES } from '../../components/ui'
import { cn } from '../../lib/cn'
import { springPop, springSnappy } from '../../lib/motion'

interface AccentPickerProps {
  label?: string
  value: number
  onChange: (tone: number) => void
}

/**
 * Animated color-theme picker over the member accent palette. The selection
 * ring slides between dots; the check pops in on a spring.
 */
export function AccentPicker({ label, value, onChange }: AccentPickerProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      <div className="flex flex-wrap gap-2.5">
        {MEMBER_TONES.map((tone, index) => {
          const selected = index === value
          return (
            <motion.button
              key={tone.dot}
              type="button"
              aria-label={`Color theme ${index + 1}`}
              aria-pressed={selected}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              transition={springSnappy}
              onClick={() => onChange(index)}
              className={cn(
                'relative flex size-8 items-center justify-center rounded-full text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                tone.dot,
              )}
            >
              {selected && (
                <motion.span
                  layoutId={`accent-ring-${id}`}
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
    </div>
  )
}
