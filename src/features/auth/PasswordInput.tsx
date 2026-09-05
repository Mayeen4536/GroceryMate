import { useId, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Field, controlClasses, controlTone, fieldDescribedBy, type FieldOwnProps } from '@/components/ui/field'

export interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'>, FieldOwnProps {}

/**
 * Input.tsx doesn't have a right-side icon slot (only `iconLeft`), so this
 * composes the same field primitives directly rather than extending the
 * shared component just for this one visibility-toggle case.
 */
export function PasswordInput({ label, helperText, error, id: idProp, className, ...rest }: PasswordInputProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [visible, setVisible] = useState(false)

  return (
    <Field id={id} label={label} helperText={helperText} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(id, helperText, error)}
          className={cn(controlClasses.base, controlTone(error), 'h-11 px-3.5 pr-11')}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded p-0.5 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  )
}
