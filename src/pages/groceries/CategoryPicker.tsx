import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'
import { CATEGORIES, type CategoryId } from '../../data/groceries'

interface CategoryPickerProps {
  value: CategoryId
  onChange: (value: CategoryId) => void
}

/** Single-select category chips with each category's own tint. */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Category</span>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const isSelected = category.id === value
          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.93 }}
              transition={springSnappy}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                'transition-[background-color,color,box-shadow] duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                isSelected
                  ? cn(category.chip, 'shadow-soft ring-1 ring-ink/10')
                  : 'bg-surface text-ink-soft ring-1 ring-line hover:ring-ink/20',
              )}
            >
              <category.icon size={13} aria-hidden="true" />
              {category.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
