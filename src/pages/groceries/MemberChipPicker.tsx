import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Avatar } from '../../components/ui'
import { cn } from '../../lib/cn'
import { springPop, springSnappy } from '../../lib/motion'

interface MemberChipPickerProps {
  label: string
  members: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

const firstName = (name: string) => name.split(' ')[0]

/**
 * Multi-select as tactile member chips: avatar, name, and a check that
 * pops onto the avatar when selected. Everyone/no-one shortcut included.
 */
export function MemberChipPicker({ label, members, selected, onChange }: MemberChipPickerProps) {
  const allSelected = selected.length === members.length

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((member) => member !== name)
        : [...selected, name],
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : [...members])}
          className="rounded text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          {allSelected ? 'Clear' : 'Everyone'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((name) => {
          const isSelected = selected.includes(name)
          return (
            <motion.button
              key={name}
              type="button"
              onClick={() => toggle(name)}
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
                <Avatar name={name} size="sm" />
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
              {firstName(name)}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
