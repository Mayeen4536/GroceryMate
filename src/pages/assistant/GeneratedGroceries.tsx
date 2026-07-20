import { motion } from 'framer-motion'
import { Check, RotateCcw, Sparkles } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { riseChild, staggerChildren, transitionBase } from '../../lib/motion'
import type { GroceryItem } from '../../data/groceries'
import { GroceryCard } from '../groceries/GroceryCard'

interface GeneratedGroceriesProps {
  items: GroceryItem[]
  onAddGroceries: () => void
  onReset: () => void
}

/** The reveal once generation finishes: the AI's suggested list, ready to review. */
export function GeneratedGroceries({ items, onAddGroceries, onReset }: GeneratedGroceriesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionBase}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Your groceries are ready
          </h2>
          <p className="mt-1 text-sm text-muted">
            Review the list, then add it to this week's groceries.
          </p>
        </div>
        <Badge tone="mint" icon={Sparkles}>
          AI generated
        </Badge>
      </div>

      <motion.ul
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="space-y-2.5"
      >
        {items.map((item) => (
          <motion.li key={item.id} variants={riseChild}>
            <GroceryCard item={item} preview />
          </motion.li>
        ))}
      </motion.ul>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button iconLeft={Check} onClick={onAddGroceries}>
          Add to groceries
        </Button>
        <Button variant="ghost" iconLeft={RotateCcw} onClick={onReset}>
          Try another prompt
        </Button>
      </div>
    </motion.div>
  )
}
