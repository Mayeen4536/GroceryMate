import { motion } from 'framer-motion'
import { Avatar, Card } from '../../components/ui'
import { SettleButton } from '../../components/experience'
import { formatTaka, type Settlement } from '../../data/settlements'

interface JourneyCardProps {
  settlement: Settlement
  onPaid: (id: string) => void
}

const firstName = (name: string) => name.split(' ')[0]

function Person({ name, role }: { name: string; role: 'pays' | 'receives' }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar name={name} size="md" />
      <div>
        <p className="text-sm font-semibold leading-tight text-ink">{firstName(name)}</p>
        <p className="text-[0.6875rem] uppercase tracking-wide text-muted">{role}</p>
      </div>
    </div>
  )
}

/**
 * A payment journey: debtor at the top, money flowing down through the
 * amount, creditor at the bottom. The dots run until it's marked paid.
 */
export function JourneyCard({ settlement, onPaid }: JourneyCardProps) {
  return (
    <Card padding="lg" className="relative overflow-hidden text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-14 left-1/2 size-40 -translate-x-1/2 rounded-full bg-brand-500/10 blur-2xl"
      />
      <div className="relative flex flex-col items-center">
        <Person name={settlement.from} role="pays" />

        <div className="relative flex h-24 w-full flex-col items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-line"
          />
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              aria-hidden="true"
              className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-brand-500"
              initial={{ top: '-4%', opacity: 0 }}
              animate={{ top: ['-4%', '104%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.8, delay: index * 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          <div className="card-surface relative z-10 flex items-baseline gap-1.5 rounded-full px-4 py-1.5 shadow-soft">
            <span className="text-xs text-muted">pays</span>
            <span className="text-sm font-bold tabular-nums text-ink">
              {formatTaka(Number.parseFloat(settlement.amount) || 0)}
            </span>
          </div>
        </div>

        <Person name={settlement.to} role="receives" />

        <SettleButton
          className="mt-5 w-full"
          idleLabel="Mark as paid"
          doneLabel="Paid"
          onComplete={() => onPaid(settlement.id)}
        />
      </div>
    </Card>
  )
}
