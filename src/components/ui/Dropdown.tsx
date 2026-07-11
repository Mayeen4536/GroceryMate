import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { transitionFast } from '../../lib/motion'
import { Field, controlClasses, controlTone, fieldDescribedBy, type FieldOwnProps } from './field'

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownProps extends FieldOwnProps {
  options: DropdownOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

/**
 * Animated select: the menu springs open under the trigger, the chevron
 * rotates, and the active option follows pointer and arrow keys.
 * Keyboard: Enter/Space/Arrows open, Arrows move, Enter selects, Escape closes.
 */
export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  helperText,
  error,
  id: idProp,
  className,
  disabled,
}: DropdownProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((option) => option.value === value) ?? null

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  const select = (index: number) => {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(activeIndex)
        break
      case 'Escape':
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <Field id={id} label={label} helperText={helperText} error={error} className={className}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(id, helperText, error)}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          className={cn(
            controlClasses.base,
            controlTone(error),
            'flex h-11 items-center justify-between gap-2 px-3.5 text-left',
            open && 'border-brand-500',
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted/70')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted transition-transform duration-200 ease-soft',
              open && 'rotate-180',
            )}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul
              id={`${id}-listbox`}
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={transitionFast}
              className="card-surface absolute inset-x-0 top-full z-20 mt-2 max-h-60 origin-top overflow-y-auto rounded-lg p-1.5 shadow-lifted"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value
                const isActive = index === activeIndex
                return (
                  <li
                    key={option.value}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActiveIndex(index)}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => select(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-100',
                      isActive ? 'bg-sand text-ink' : 'text-ink-soft',
                      isSelected && 'font-medium text-brand-700',
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={15} aria-hidden="true" className="shrink-0 text-brand-600" />}
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </Field>
  )
}
