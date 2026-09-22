import { useId, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleAlert } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { cn } from '@/utils/cn'
import { springPop, springSnappy, transitionFast } from '@/animations/motion'
import { firstName } from '@/utils/name'

export interface MemberChipOption {
  readonly id: string
  readonly name: string
}

interface MemberChipPickerProps {
  label: string
  members: readonly MemberChipOption[]
  /** Selected member ids — not names, so two members sharing a display name are never confused with each other. */
  selected: readonly string[]
  onChange: (selectedIds: string[]) => void
  error?: string
  /** Lets a caller (e.g. a form's submit handler) move focus here on validation failure. */
  groupRef?: RefObject<HTMLDivElement | null>
}

/**
 * Multi-select as tactile member chips: avatar, name, and a check that
 * pops onto the avatar when selected. Everyone/no-one shortcut included.
 *
 * Selection is tracked by member id, not display name: two members who
 * happen to share a name (a realistic case, not a hypothetical one) must
 * still toggle independently rather than both reacting to one chip.
 */
export function MemberChipPicker({
  label,
  members,
  selected,
  onChange,
  error,
  groupRef,
}: MemberChipPickerProps) {
  const errorId = useId()
  const allSelected = selected.length === members.length

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((memberId) => memberId !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : members.map((member) => member.id))}
          className="rounded text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {allSelected ? 'Clear' : 'Everyone'}
        </button>
      </div>
      <div
        ref={groupRef}
        tabIndex={-1}
        role="group"
        aria-label={label}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap gap-2 focus:outline-none"
      >
        {members.map((member) => {
          const isSelected = selected.includes(member.id)
          return (
            <motion.button
              key={member.id}
              type="button"
              onClick={() => toggle(member.id)}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.93 }}
              transition={springSnappy}
              className={cn(
                'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium',
                'transition-[background-color,color,box-shadow] duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                isSelected
                  ? 'bg-mint-100 text-brand-800 shadow-soft ring-1 ring-brand-600/25'
                  : 'bg-surface text-ink-soft ring-1 ring-line hover:ring-ink/20',
              )}
            >
              <span className="relative">
                <Avatar name={member.name} size="sm" />
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springPop}
                      className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-surface"
                    >
                      <Check size={10} strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {firstName(member.name)}
            </motion.button>
          )
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {error && (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transitionFast}
            className="flex items-center gap-1.5 text-sm text-danger-700"
          >
            <CircleAlert size={15} aria-hidden="true" className="shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
