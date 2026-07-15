import { motion } from 'framer-motion'
import { Heart, UserPlus, Users } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { cn } from '../../lib/cn'

const orbitChips = [
  { icon: UserPlus, tone: 'text-brand-600', className: '-top-1 left-8', duration: 5.5, delay: 0 },
  { icon: Heart, tone: 'text-member-rose-strong', className: 'right-0 top-10', duration: 6.5, delay: 0.6 },
  { icon: UserPlus, tone: 'text-member-sky-strong', className: 'bottom-1 left-3', duration: 7.5, delay: 1.1 },
]

/** Empty state for a household with no members yet. */
export function MembersEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card padding="none" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-28 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-member-violet-strong/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
        <div className="relative flex size-36 items-center justify-center">
          <motion.span
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-member-violet-strong/30"
          />
          <motion.span
            aria-hidden="true"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex size-16 items-center justify-center rounded-xl bg-linear-to-br from-member-violet-soft to-member-sky-soft text-member-violet-strong shadow-card ring-1 ring-ink/5"
          >
            <Users size={28} />
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
            Your household starts with people.
          </h2>
          <p className="mx-auto max-w-xs text-sm text-muted">
            Add members and every grocery split takes care of itself.
          </p>
        </div>
        <Button iconLeft={UserPlus} onClick={onAdd}>
          Add your first member
        </Button>
      </div>
    </Card>
  )
}
