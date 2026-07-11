import { useId, type ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Field, controlClasses, controlTone, fieldDescribedBy, type FieldOwnProps } from './field'

export interface SelectProps extends ComponentProps<'select'>, FieldOwnProps {}

/** Native select with label, helper text and error state. Pass `<option>` elements as children. */
export function Select({
  label,
  helperText,
  error,
  id: idProp,
  className,
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <Field id={id} label={label} helperText={helperText} error={error} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(id, helperText, error)}
          className={cn(controlClasses.base, controlTone(error), 'peer h-11 appearance-none pl-3.5 pr-10')}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors duration-200 peer-focus:text-brand-600"
        />
      </div>
    </Field>
  )
}
