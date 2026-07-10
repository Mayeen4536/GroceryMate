import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { Field, controlClasses, controlTone, fieldDescribedBy, type FieldOwnProps } from './field'

export interface TextareaProps extends ComponentProps<'textarea'>, FieldOwnProps {}

/** Multi-line input with label, helper text and error state. `className` styles the outer wrapper. */
export function Textarea({
  label,
  helperText,
  error,
  id: idProp,
  rows = 4,
  className,
  ...rest
}: TextareaProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId

  return (
    <Field id={id} label={label} helperText={helperText} error={error} className={className}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, helperText, error)}
        className={cn(controlClasses.base, controlTone(error), 'resize-y px-3.5 py-2.5 leading-relaxed')}
        {...rest}
      />
    </Field>
  )
}
