import { useId, type ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Field, controlClasses, controlTone, fieldDescribedBy, type FieldOwnProps } from './field'

export interface InputProps extends ComponentProps<'input'>, FieldOwnProps {
  /** Optional leading icon. */
  iconLeft?: LucideIcon
}

/** Text input with label, helper text and error state. `className` styles the outer wrapper. */
export function Input({
  label,
  helperText,
  error,
  iconLeft: IconLeft,
  id: idProp,
  className,
  ...rest
}: InputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <Field id={id} label={label} helperText={helperText} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(id, helperText, error)}
          className={cn(
            controlClasses.base,
            controlTone(error),
            'peer h-11 px-3.5',
            IconLeft && 'pl-10',
          )}
          {...rest}
        />
        {IconLeft && (
          <IconLeft
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 peer-focus:text-brand-600"
          />
        )}
      </div>
    </Field>
  )
}
