import { motion } from 'framer-motion'
import { Apple, Carrot, Egg, Plus, ShoppingBasket } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { cn } from '../../lib/cn'

const orbitChips = [
  { icon: Apple, tone: 'text-danger-500', className: '-top-1 left-8', duration: 5.5, delay: 0 },
  { icon: Carrot, tone: 'text-warning-500', className: 'right-0 top-10', duration: 6.5, delay: 0.6 },
  { icon: Egg, tone: 'text-member-gold-strong', className: 'bottom-1 left-3', duration: 7.5, delay: 1.1 },
]

/** Empty state: a floating basket illustration built from UI pieces. */
export function GroceriesEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card padding="none" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-28 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
        <div className="relative flex size-36 items-center justify-center">
          <motion.span
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-brand-300/50"
          />
          <motion.span
            aria-hidden="true"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex size-16 items-center justify-center rounded-xl bg-linear-to-br from-brand-100 to-mint-100 text-brand-700 shadow-card ring-1 ring-ink/5"
          >
            <ShoppingBasket size={28} />
          </motion.span>
          {orbitChips.map(({ icon: Icon, tone, className, duration, delay }) => (
            <motion.span
              key={className}
              aria-hidden="true"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'absolute flex size-9 items-center justify-center rounded-lg bg-surface shadow-card ring-1 ring-ink/5',
                className,
                tone,
              )}
            >
              <Icon size={16} />
            </motion.span>
          ))}
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Your first grocery starts here.
          </h2>
          <p className="mx-auto max-w-xs text-sm text-muted">
            Add groceries and GroceryMate will take care of the math.
          </p>
        </div>
        <Button iconLeft={Plus} onClick={onAdd}>
          Add your first grocery
        </Button>
      </div>
    </Card>
  )
}
