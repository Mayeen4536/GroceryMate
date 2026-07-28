import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { springPop, springSnappy } from '@/animations/motion'

export interface SwatchOption<T extends string | number> {
  id: T
  /** Solid dot class for the swatch, e.g. 'bg-member-coral-strong'. */
  dot: string
  /** Accessible name; also shown as a title tooltip when `showTooltip` is set. */
  label?: string
}

export interface SwatchPickerProps<T extends string | number> {
  options: Array<SwatchOption<T>>
  value: T
  onChange: (value: T) => void
  /** Optional heading rendered above the swatches. */
  label?: string
  /** Shows each swatch's `label` as a native title tooltip. Defaults to false. */
  showTooltip?: boolean
}

/**
 * Animated color-swatch picker: the selection ring slides between dots, the
 * check pops in on a spring. Shared by member color themes and app accent themes.
 */
export function SwatchPicker<T extends string | number>({
  options,
  value,
  onChange,
  label,
  showTooltip = false,
}: SwatchPickerProps<T>) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const selected = option.id === value
          return (
            <motion.button
              key={option.id}
              type="button"
              aria-label={option.label}
              aria-pressed={selected}
              title={showTooltip ? option.label : undefined}
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
                  layoutId={`swatch-ring-${id}`}
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
