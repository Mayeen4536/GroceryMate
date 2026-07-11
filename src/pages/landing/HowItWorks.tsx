import { motion, type Variants } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  HandCoins,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Badge } from '../../components/ui'
import { cn } from '../../lib/cn'
import { riseChild, transitionBase } from '../../lib/motion'
import { mockMembers } from '../../data/mock'

interface Step {
  key: string
  title: string
  copy: string
  icon?: LucideIcon
  tile?: string
  glow?: boolean
}

const steps: Step[] = [
  {
    key: 'friends',
    title: 'Friends',
    copy: 'Everyone who shares the kitchen, added once.',
  },
  {
    key: 'groceries',
    title: 'Groceries',
    copy: 'Items, prices, and who paid, logged in seconds.',
    icon: ShoppingBasket,
    tile: 'from-brand-100 to-mint-100 text-brand-700',
  },
  {
    key: 'ai',
    title: 'AI',
    copy: '"2L milk, split with Bilal" becomes a tracked expense.',
    icon: Sparkles,
    tile: 'from-member-gold-soft to-warning-50 text-member-gold-strong',
    glow: true,
  },
  {
    key: 'settlement',
    title: 'Fair settlement',
    copy: 'One tap shows exactly who owes whom.',
    icon: HandCoins,
    tile: 'from-mint-100 to-brand-100 text-brand-700',
  },
]

const flowStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16 } },
}

const connectorVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: transitionBase },
}

function StepVisual({ step }: { step: Step }) {
  if (!step.icon) {
    // The Friends step is people, not an icon.
    return (
      <div className="flex h-14 items-center -space-x-2.5">
        {mockMembers.slice(0, 3).map((name) => (
          <Avatar key={name} name={name} className="ring-2 ring-canvas" />
        ))}
      </div>
    )
  }
  const Icon = step.icon
  return (
    <div className="relative flex h-14 items-center">
      {step.glow && (
        <motion.span
          aria-hidden="true"
          className="absolute -inset-2 rounded-2xl bg-warning-500/25 blur-lg"
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <motion.span
        whileHover={{ rotate: 3, scale: 1.06 }}
        className={cn(
          'relative flex size-14 items-center justify-center rounded-xl bg-linear-to-br shadow-card ring-1 ring-ink/5',
          step.tile,
        )}
      >
        <Icon size={24} aria-hidden="true" />
      </motion.span>
    </div>
  )
}

function Connector() {
  return (
    <motion.div
      variants={connectorVariants}
      aria-hidden="true"
      className="flex items-center justify-center py-1 lg:mt-3 lg:py-0"
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-mint-100/80 text-brand-600">
        <ChevronDown size={16} className="lg:hidden" />
        <ChevronRight size={16} className="hidden lg:block" />
      </span>
    </motion.div>
  )
}

/** The Friends -> Groceries -> AI -> Fair settlement journey. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-10 px-4 pb-28 pt-10 sm:px-6">
      <motion.div
        variants={riseChild}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto max-w-xl text-center"
      >
        <Badge tone="mint">How it works</Badge>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink">
          From shared kitchen to settled up
        </h2>
        <p className="mt-3 text-muted">
          Four steps, no spreadsheets. GroceryMate keeps the math invisible and the split fair.
        </p>
      </motion.div>

      <motion.div
        variants={flowStagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mt-14 flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-3"
      >
        {steps.map((step, index) => (
          <div key={step.key} className="contents">
            {index > 0 && <Connector />}
            <motion.div
              variants={riseChild}
              className="flex w-full max-w-xs flex-col items-center text-center lg:flex-1"
            >
              <StepVisual step={step} />
              <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.copy}</p>
            </motion.div>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
