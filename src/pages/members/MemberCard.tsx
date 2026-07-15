import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, Card, MEMBER_TONES } from '../../components/ui'
import { cn } from '../../lib/cn'
import { STATUS_META, type Member } from '../../data/members'

interface MemberCardProps {
  member: Member
  onOpen: (id: string) => void
  /** One-shot mint flash for freshly added members. */
  highlight?: boolean
}

export function MemberCard({ member, onOpen, highlight = false }: MemberCardProps) {
  const status = STATUS_META[member.status]
  const tone = MEMBER_TONES[member.tone % MEMBER_TONES.length]
  const invited = member.status === 'invited'

  return (
    <Card
      variant="interactive"
      onClick={() => onOpen(member.id)}
      aria-label={`Open ${member.name}'s profile`}
      className="group relative overflow-hidden"
    >
      {highlight && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0.65 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-xl bg-mint-100"
        />
      )}
      {/* The member's color theme, as a whisper in the corner */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
          tone.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <Avatar name={member.name} tone={member.tone} size="lg" />
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="relative mt-3 min-w-0">
        <p className="flex items-center gap-2 truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
          {member.name}
          {member.role === 'owner' && <Badge tone="brand">Owner</Badge>}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{member.email}</p>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{invited ? 'Waiting on' : 'Paid this month'}</p>
          {invited ? (
            <p className="text-sm font-semibold text-ink-soft">First shop</p>
          ) : (
            <p className="text-sm font-semibold tabular-nums text-ink">
              <AnimatedNumber value={Number.parseFloat(member.amountPaid) || 0} />
            </p>
          )}
        </div>
        <span className="flex translate-x-1 items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
          View profile
          <ArrowRight size={12} aria-hidden="true" />
        </span>
      </div>
    </Card>
  )
}
