import { HandCoins, ShoppingBasket, Sparkles, Trash2, type LucideIcon } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, Button, Drawer } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { STATUS_META, type Member } from '../../data/members'
import { AccentPicker } from './AccentPicker'

interface MemberProfileDrawerProps {
  member: Member | null
  onClose: () => void
  onChangeTone: (id: string, tone: number) => void
  onRemove: (id: string) => void
}

const firstName = (name: string) => name.split(' ')[0]

/** Mock activity rows; display only. */
const activityFor = (member: Member): Array<{ icon: LucideIcon; text: string; when: string }> => [
  { icon: ShoppingBasket, text: `${firstName(member.name)} added Milk (2L)`, when: 'Yesterday' },
  { icon: HandCoins, text: `Settled up with Aisha`, when: 'Monday' },
  { icon: Sparkles, text: `Joined Flat 4B`, when: member.joinedLabel },
]

export function MemberProfileDrawer({ member, onClose, onChangeTone, onRemove }: MemberProfileDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const status = member ? STATUS_META[member.status] : null

  return (
    <Drawer
      open={member != null}
      onClose={onClose}
      title="Member profile"
      side={isDesktop ? 'right' : 'bottom'}
      panelClassName="sm:max-w-md"
      footer={
        member ? (
          <Button
            variant="ghost"
            iconLeft={Trash2}
            onClick={() => onRemove(member.id)}
            className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
          >
            Remove from household
          </Button>
        ) : undefined
      }
    >
      {member && status && (
        <div className="flex flex-col gap-6 pb-4">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} tone={member.tone} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight text-ink">
                {member.name}
              </p>
              <p className="truncate text-sm text-muted">{member.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {member.role === 'owner' && <Badge tone="brand">Owner</Badge>}
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            </div>
          </div>

          <AccentPicker
            label="Color theme"
            value={member.tone}
            onChange={(tone) => onChangeTone(member.id, tone)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="card-surface rounded-lg p-4 shadow-soft">
              <p className="text-xs text-muted">Paid this month</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-ink">
                <AnimatedNumber value={Number.parseFloat(member.amountPaid) || 0} />
              </p>
            </div>
            <div className="card-surface rounded-lg p-4 shadow-soft">
              <p className="text-xs text-muted">Items added</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-ink">
                <AnimatedNumber value={member.itemsAdded} />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Recent activity</span>
            <ul className="space-y-1.5">
              {activityFor(member).map(({ icon: Icon, text, when }) => (
                <li
                  key={text}
                  className="card-surface flex items-center gap-3 rounded-lg px-3.5 py-2.5 shadow-soft"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sand text-ink-soft">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{text}</span>
                  <span className="shrink-0 text-xs text-muted">{when}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">Activity is illustrative until sessions go live.</p>
          </div>
        </div>
      )}
    </Drawer>
  )
}
