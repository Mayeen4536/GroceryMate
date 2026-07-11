import { motion } from 'framer-motion'
import { Badge, Card } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { cn } from '../lib/cn'
import { pageVariants, riseChild, springGentle } from '../lib/motion'
import type { NavItem, PageId } from '../lib/navigation'

/** Presentation-only accents so each section has its own personality. */
const accents: Record<PageId, { tile: string; glow: string }> = {
  overview: {
    tile: 'from-mint-100 to-brand-100 text-brand-700',
    glow: 'bg-brand-500/10',
  },
  groceries: {
    tile: 'from-brand-100 to-mint-100 text-brand-700',
    glow: 'bg-brand-500/10',
  },
  members: {
    tile: 'from-member-violet-soft to-member-sky-soft text-member-violet-strong',
    glow: 'bg-member-violet-strong/10',
  },
  settlements: {
    tile: 'from-member-gold-soft to-warning-50 text-member-gold-strong',
    glow: 'bg-warning-500/12',
  },
  history: {
    tile: 'from-member-sky-soft to-mint-50 text-member-sky-strong',
    glow: 'bg-member-sky-strong/10',
  },
}

/** Stand-in page body until the real screens are built. */
export function PagePlaceholder({ item }: { item: NavItem }) {
  const Icon = item.icon
  const accent = accents[item.id]

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div variants={riseChild}>
        <PageHeader title={item.label} description={item.description} />
      </motion.div>
      <motion.div variants={riseChild}>
        <Card padding="none" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className={cn(
              'absolute -top-28 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full blur-3xl',
              accent.glow,
            )}
          />
          <div className="relative flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-20">
            <motion.span
              whileHover={{ rotate: 3, scale: 1.06 }}
              transition={springGentle}
              className={cn(
                'flex size-16 items-center justify-center rounded-xl bg-linear-to-br shadow-card ring-1 ring-ink/5',
                accent.tile,
              )}
            >
              <Icon size={28} aria-hidden="true" />
            </motion.span>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-ink">
                The {item.label} screen is on its way
              </p>
              <p className="mx-auto max-w-sm text-sm text-muted">
                We're building GroceryMate step by step. This space is reserved for it.
              </p>
            </div>
            <Badge tone="mint">In design</Badge>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
