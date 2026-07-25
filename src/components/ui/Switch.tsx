import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  id?: string
  disabled?: boolean
  className?: string
}

/** iOS-style toggle: the thumb slides on a spring, the track eases between tones. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  id: idProp,
  disabled,
  className,
}: SwitchProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer select-none items-start justify-between gap-4',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex h-7 w-12 shrink-0 items-center rounded-full p-0.5',
          'transition-colors duration-200 ease-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          checked
            ? 'bg-linear-to-b from-brand-500 to-brand-700 shadow-button-brand'
            : 'bg-sand shadow-[inset_0_1px_2px_rgb(30_26_22/0.12)] ring-1 ring-inset ring-line-strong',
        )}
      >
        <motion.span
          layout
          transition={springSnappy}
          className={cn(
            'size-6 rounded-full bg-white shadow-[0_1px_2px_rgb(30_26_22/0.3)]',
            checked && 'ml-auto',
          )}
        />
      </button>
    </label>
  )
}
