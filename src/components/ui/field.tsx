import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Props shared by every form control (Input, Textarea, Select). */
export interface FieldOwnProps {
  /** Visible label rendered above the control. */
  label?: string
  /** Supporting text below the control. Hidden while `error` is set. */
  helperText?: string
  /** Error message; switches the control into its error state. */
  error?: string
}

export function fieldIds(id: string) {
  return { helperId: `${id}-helper`, errorId: `${id}-error` } as const
}

export function fieldDescribedBy(
  id: string,
  helperText?: string,
  error?: string,
): string | undefined {
  const { helperId, errorId } = fieldIds(id)
  if (error) return errorId
  if (helperText) return helperId
  return undefined
}

export const controlClasses = {
  base: cn(
    'w-full rounded-md border bg-surface text-[0.9375rem] text-ink placeholder:text-muted/60',
    'shadow-[0_1px_2px_rgb(30_26_22/0.03)]',
    'transition-[border-color,box-shadow,background-color] duration-150 ease-soft',
    'focus:outline-none focus:ring-4',
    'disabled:cursor-not-allowed disabled:bg-sand disabled:shadow-none disabled:opacity-70',
  ),
  valid:
    'border-line-strong hover:border-ink/25 focus:border-brand-500 focus:ring-brand-500/12',
  invalid: 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/12',
}

export function controlTone(error?: string): string {
  return error ? controlClasses.invalid : controlClasses.valid
}

interface FieldProps extends FieldOwnProps {
  id: string
  className?: string
  children: ReactNode
}

/** Layout wrapper: label above the control, helper or error text below. */
export function Field({ id, label, helperText, error, className, children }: FieldProps) {
  const { helperId, errorId } = fieldIds(id)
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger-700">
          <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
