import { useId, type ComponentProps } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: string
  description?: string
}

/**
 * Checkbox with a drawing check mark and a soft pop on check.
 * Works controlled (`checked` + `onChange`) or uncontrolled (`defaultChecked`).
 */
export function Checkbox({ label, description, id: idProp, className, ...rest }: CheckboxProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <label
      htmlFor={id}
      className={cn('group flex cursor-pointer select-none items-start gap-2.5', className)}
    >
      <motion.span
        whileTap={{ scale: 0.88 }}
        transition={springSnappy}
        className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center"
      >
        <input
          type="checkbox"
          id={id}
          className={cn(
            'checkbox-box peer absolute inset-0 cursor-pointer appearance-none rounded-[0.3125rem] border border-line-strong bg-surface',
            'transition-[border-color,background-color,box-shadow] duration-200 ease-soft',
            'hover:border-ink/30',
            'checked:border-transparent checked:bg-linear-to-b checked:from-brand-500 checked:to-brand-700 checked:shadow-button-brand',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...rest}
        />
        <svg
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="checkbox-mark pointer-events-none relative size-3"
        >
          <path
            d="M2 6.5 4.7 9 10 3.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
        </span>
      )}
    </label>
  )
}
