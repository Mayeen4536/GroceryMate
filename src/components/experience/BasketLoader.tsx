import { motion } from 'framer-motion'
import { ShoppingBasket } from 'lucide-react'
import { cn } from '../../lib/cn'

const drops = [
  { color: 'bg-danger-500', left: '32%', delay: 0 },
  { color: 'bg-brand-500', left: '48%', delay: 0.35 },
  { color: 'bg-warning-500', left: '62%', delay: 0.7 },
]

/**
 * GroceryMate's loading state: groceries drop into the basket while it
 * bobs gently. Loaders are the one place looping motion is expected.
 */
export function BasketLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3">
      <div className="relative flex h-16 w-20 items-end justify-center">
        {drops.map((drop) => (
          <motion.span
            key={drop.left}
            aria-hidden="true"
            className={cn('absolute top-0 size-2.5 rounded-full', drop.color)}
            style={{ left: drop.left }}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: [-8, 10, 26], opacity: [0, 1, 0], scale: [1, 1, 0.8] }}
            transition={{ duration: 1.05, delay: drop.delay, repeat: Infinity, ease: 'easeIn' }}
          />
        ))}
        <motion.span
          aria-hidden="true"
          animate={{ y: [0, 1.5, 0] }}
          transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
          className="text-brand-700"
        >
          <ShoppingBasket size={34} strokeWidth={1.8} />
        </motion.span>
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
