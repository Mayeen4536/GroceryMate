import { motion } from 'framer-motion'
import { Card } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { fadeInUp } from '../lib/motion'
import type { NavItem } from '../lib/navigation'

/** Stand-in page body until the real screens are built. */
export function PagePlaceholder({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <PageHeader title={item.label} description={item.description} />
      <Card className="flex flex-col items-center gap-3 border-dashed py-16 text-center shadow-none">
        <span className="flex size-12 items-center justify-center rounded-lg bg-sand text-ink-soft">
          <Icon size={22} aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">The {item.label} screen is on its way</p>
          <p className="text-sm text-muted">
            We're building GroceryMate step by step. This space is reserved for it.
          </p>
        </div>
      </Card>
    </motion.div>
  )
}
