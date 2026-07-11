import { motion } from 'framer-motion'
import { Apple, Carrot, Check, Egg, Milk, type LucideIcon } from 'lucide-react'
import { Avatar, Badge, Card } from '../../components/ui'
import { cn } from '../../lib/cn'
import { springGentle } from '../../lib/motion'
import { mockMembers } from '../../data/mock'

const mockItems: Array<{
  icon: LucideIcon
  tone: string
  name: string
  payer: string
  amount: string
  shared: boolean
}> = [
  {
    icon: Milk,
    tone: 'bg-member-sky-soft text-member-sky-strong',
    name: 'Milk (2L)',
    payer: 'Aisha Khan',
    amount: '240',
    shared: true,
  },
  {
    icon: Egg,
    tone: 'bg-member-gold-soft text-member-gold-strong',
    name: 'Eggs (dozen)',
    payer: 'Bilal Ahmed',
    amount: '320',
    shared: true,
  },
  {
    icon: Apple,
    tone: 'bg-member-coral-soft text-member-coral-strong',
    name: 'Apples (1kg)',
    payer: 'Chloe Lee',
    amount: '180',
    shared: false,
  },
]

/** Entrance + endless gentle drift, nested so the two transforms compose. */
function Floating({
  className,
  delay,
  duration,
  children,
}: {
  className?: string
  delay: number
  duration: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      className={cn('absolute', className)}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springGentle, delay }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function GroceryChip({ icon: Icon, toneText }: { icon: LucideIcon; toneText: string }) {
  return (
    <div className="flex size-11 items-center justify-center rounded-lg bg-surface shadow-lifted ring-1 ring-ink/5">
      <Icon size={20} aria-hidden="true" className={toneText} />
    </div>
  )
}

/** The floating product mockup in the hero. Pure UI components, no images. */
export function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      aria-hidden="true"
      className="relative mx-auto w-full max-w-md select-none lg:max-w-lg"
    >
      {/* Glow bed behind the card */}
      <motion.div
        className="absolute inset-x-6 bottom-0 top-8 rounded-[3rem] bg-brand-400/20 blur-3xl"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main dashboard card, floating */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <Card padding="none" className="overflow-hidden shadow-lifted rotate-[1.2deg]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">Flat 4B</p>
              <p className="text-xs text-muted">This week · 12 items</p>
            </div>
            <div className="flex -space-x-2">
              {mockMembers.slice(0, 3).map((name) => (
                <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
              ))}
            </div>
          </div>
          <div className="border-t border-line">
            {mockItems.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    item.tone,
                  )}
                >
                  <item.icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-muted">paid by {item.payer.split(' ')[0]}</p>
                </div>
                {item.shared && <Badge tone="mint">Shared</Badge>}
                <p className="w-10 text-right text-sm font-semibold tabular-nums text-ink">
                  {item.amount}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-mint-50/70 px-5 py-4">
            <div>
              <p className="text-xs text-muted">Fair settlement</p>
              <p className="text-sm font-semibold text-ink">
                Bilal owes Aisha <span className="tabular-nums">410</span>
              </p>
            </div>
            <Badge tone="success" icon={Check}>
              One tap
            </Badge>
          </div>
        </Card>
      </motion.div>

      {/* Floating grocery icons */}
      <Floating className="hidden sm:block sm:-left-10 sm:top-6" delay={0.7} duration={6}>
        <GroceryChip icon={Apple} toneText="text-member-coral-strong" />
      </Floating>
      <Floating className="hidden sm:block sm:-right-9 sm:top-36" delay={0.9} duration={7}>
        <GroceryChip icon={Carrot} toneText="text-warning-500" />
      </Floating>
      <Floating className="-left-6 bottom-40 hidden sm:block sm:-left-12" delay={1.1} duration={8}>
        <GroceryChip icon={Egg} toneText="text-member-gold-strong" />
      </Floating>

      {/* Avatar bubbles */}
      <Floating className="-top-9 right-6 sm:-top-8 sm:-right-8" delay={1} duration={6.5}>
        <div className="flex items-center gap-2 rounded-full bg-surface/95 py-1.5 pl-1.5 pr-3 shadow-lifted ring-1 ring-ink/5 backdrop-blur">
          <Avatar name="Aisha Khan" size="sm" />
          <div>
            <p className="text-xs font-semibold leading-tight text-ink">Aisha paid</p>
            <p className="text-[0.6875rem] leading-tight text-muted">740 this week</p>
          </div>
        </div>
      </Floating>
      <Floating className="-bottom-7 left-2 sm:-left-6" delay={1.25} duration={7.5}>
        <div className="flex items-center gap-2 rounded-full bg-surface/95 py-1.5 pl-1.5 pr-3 shadow-lifted ring-1 ring-ink/5 backdrop-blur">
          <div className="flex -space-x-1.5">
            {mockMembers.map((name) => (
              <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
            ))}
          </div>
          <p className="text-xs font-medium text-ink-soft">Split 4 ways</p>
        </div>
      </Floating>
    </motion.div>
  )
}
