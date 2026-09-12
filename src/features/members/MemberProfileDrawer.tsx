import { useState } from 'react'
import { AlertTriangle, RotateCcw, ShoppingBasket, Sparkles, Trash2, type LucideIcon } from 'lucide-react'
import { AnimatedNumber, Avatar, Badge, Button, Drawer, MEMBER_TONES, Modal, SwatchPicker } from '@/components/ui'
import { useHousehold } from '@/household/useHousehold'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { STATUS_META } from '@/constants/memberStatus'
import { fullDateLabel } from '@/utils/date'
import { firstName } from '@/utils/name'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

interface MemberProfileDrawerProps {
  member: Member | null
  /** Same real, already-loaded list every other page uses — recent activity is derived from it, never a second query. */
  groceries: readonly GroceryItem[]
  onClose: () => void
  onChangeTone: (id: string, tone: number) => void
  onRemove: (id: string) => void
  onReactivate: (id: string) => void
  /**
   * Migration 3's RLS already enforces owner-only membership management —
   * this only hides controls a non-owner couldn't successfully use, it
   * isn't itself a security boundary. A non-owner attempting the same
   * write via the API directly would still be correctly rejected server-side.
   */
  isOwner: boolean
  /** See the same prop on `MemberCard` — the calculation currently can't run, so financial fields show as unavailable rather than a number that can no longer be trusted. */
  financialsUnavailable?: boolean
}

const RECENT_ACTIVITY_LIMIT = 3

/**
 * Real recent activity: the member's own most-recently-logged groceries
 * (`createdByMemberId`, newest first — `groceries` already loads that way),
 * plus their real join date. There is no persisted "settled up" event yet
 * (same limitation as the Settlements page's payment timeline — see
 * docs/HISTORY_INTEGRATION.md), so no such row is fabricated here either.
 */
function buildActivity(
  member: Member,
  groceries: readonly GroceryItem[],
  householdName: string,
): Array<{ id: string; icon: LucideIcon; text: string; when: string }> {
  const added = groceries
    .filter((item) => item.createdByMemberId === member.id)
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((item) => ({
      id: item.id,
      icon: ShoppingBasket,
      text: `${firstName(member.name)} added ${item.name}`,
      when: fullDateLabel(item.createdAt),
    }))
  return [...added, { id: 'joined', icon: Sparkles, text: `Joined ${householdName}`, when: member.joinedLabel }]
}

export function MemberProfileDrawer({
  member,
  groceries,
  onClose,
  onChangeTone,
  onRemove,
  onReactivate,
  isOwner,
  financialsUnavailable = false,
}: MemberProfileDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { household } = useHousehold()
  const status = member ? STATUS_META[member.status] : null
  const [confirmOpen, setConfirmOpen] = useState(false)
  const archived = member?.status === 'archived'

  const confirmRemove = () => {
    if (!member) return
    setConfirmOpen(false)
    onRemove(member.id)
  }

  return (
    <Drawer
      open={member != null}
      onClose={onClose}
      title="Member profile"
      side={isDesktop ? 'right' : 'bottom'}
      panelClassName="sm:max-w-md"
      footer={
        // The owner role can't be archived from here at all — Migration 1's
        // schema keeps "never fewer than one owner" as an application-level
        // invariant, not something RLS enforces on its own (an owner
        // technically *can* archive their own row); ownership transfer is
        // out of scope for this slice, so this is the safeguard until it
        // exists. Regular/invited members can be archived; archived members
        // can be reactivated — both owner-only, per Migration 3's RLS.
        member && isOwner && member.role !== 'owner' ? (
          archived ? (
            <Button variant="secondary" iconLeft={RotateCcw} onClick={() => onReactivate(member.id)}>
              Reactivate
            </Button>
          ) : (
            <Button
              variant="ghost"
              iconLeft={Trash2}
              onClick={() => setConfirmOpen(true)}
              className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
            >
              Remove from household
            </Button>
          )
        ) : undefined
      }
    >
      {member && (
        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={`Remove ${firstName(member.name)} from the household?`}
          alwaysCentered
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" iconLeft={Trash2} onClick={confirmRemove}>
                Yes, remove them
              </Button>
            </>
          }
        >
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
              <AlertTriangle size={19} aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-ink-soft">
              {`${member.name} will lose access to this household's groceries and settlements. Their past activity stays intact, and you can reactivate them again later from this same profile.`}
            </p>
          </div>
        </Modal>
      )}
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
                {financialsUnavailable ? (
                  <Badge tone="neutral">Unavailable</Badge>
                ) : (
                  <Badge tone={status.tone}>{status.label}</Badge>
                )}
              </div>
            </div>
          </div>

          <SwatchPicker
            label="Color theme"
            options={MEMBER_TONES.map((tone, index) => ({
              id: index,
              dot: tone.dot,
              label: `Color theme ${index + 1}`,
            }))}
            value={member.tone}
            onChange={(tone) => onChangeTone(member.id, tone)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="card-surface rounded-lg p-4 shadow-soft">
              <p className="text-xs text-muted">Total paid</p>
              <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-ink">
                {financialsUnavailable ? '—' : <AnimatedNumber value={Number.parseFloat(member.amountPaid) || 0} />}
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
              {buildActivity(member, groceries, household?.name ?? 'this household').map(({ id, icon: Icon, text, when }) => (
                <li
                  key={id}
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
          </div>
        </div>
      )}
    </Drawer>
  )
}
