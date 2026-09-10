import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, RotateCcw, Sparkles } from 'lucide-react'
import { Badge, Button, Dropdown } from '@/components/ui'
import { riseChild, staggerChildren, transitionBase } from '@/animations/motion'
import { useMemberOptions } from '@/hooks/useMemberOptions'
import { categoryById } from '@/utils/groceryCategory'
import { formatTaka } from '@/utils/money'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import { MemberChipPicker } from '@/features/groceries/MemberChipPicker'

interface GeneratedGroceriesProps {
  items: GroceryItem[]
  /** The household's current roster — the only source financial participant selection reads from. */
  members: readonly Member[]
  onAddGroceries: (items: GroceryItem[]) => Promise<{ error?: string }>
  onReset: () => void
}

/**
 * Whether an item's stored payer/sharer ids both match a member on the
 * *current, selectable* roster — not just whether they're non-empty. A
 * generated item's suggested payer/sharers could reference someone no
 * longer selectable (archived, or removed after this mock content was
 * generated); treating that as "resolved" because the id isn't blank would
 * let a stale reference reach the real grocery list, where the settlement
 * engine would only refuse it later.
 */
export function isFullyResolved(item: GroceryItem, memberOptions: ReturnType<typeof useMemberOptions>): boolean {
  const validIds = new Set(memberOptions.options.map((option) => option.id))
  const hasPayer = item.paidByMemberId !== '' && validIds.has(item.paidByMemberId)
  // Every id must be valid, not just one of them: a mix of one valid and
  // one stale sharer must still count as unresolved, or the stale
  // reference would ride along untouched into the real grocery list the
  // moment the user submits without ever having to open this item's picker.
  const hasSharers =
    item.sharedByMemberIds.length > 0 && item.sharedByMemberIds.every((id) => validIds.has(id))
  return hasPayer && hasSharers
}

/**
 * One generated item, editable in place. AI-suggested items may not state
 * who paid or who it's for — GroceryMate never guesses either; whatever's
 * missing here is visibly flagged and must be filled in before it can join
 * the real list.
 */
function GeneratedItemReview({
  item,
  memberOptions,
  showErrors,
  onChange,
}: {
  item: GroceryItem
  memberOptions: ReturnType<typeof useMemberOptions>
  showErrors: boolean
  onChange: (patch: Partial<Pick<GroceryItem, 'paidByMemberId' | 'sharedByMemberIds'>>) => void
}) {
  const category = categoryById(item.category)
  const validIds = useMemo(() => new Set(memberOptions.options.map((option) => option.id)), [memberOptions])
  const paidById = item.paidByMemberId && validIds.has(item.paidByMemberId) ? item.paidByMemberId : null
  const sharedByIds = item.sharedByMemberIds.filter((id) => validIds.has(id))
  const needsPayer = paidById === null
  // Flags a partially-stale list too (one valid sharer plus one that no
  // longer resolves), not just an empty one — matches `isFullyResolved`'s
  // stricter "every id must be valid" rule below, so the badge and the
  // submit gate never disagree about whether this item is really done.
  const needsSharers = item.sharedByMemberIds.length === 0 || sharedByIds.length !== item.sharedByMemberIds.length

  return (
    <motion.li variants={riseChild} className="card-surface space-y-4 rounded-lg p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br shadow-soft ring-1 ring-ink/5 ${category.tile}`}
        >
          <category.icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {item.name || 'New grocery'}
            {item.quantity > 1 && <span className="font-normal text-muted"> × {item.quantity}</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {needsPayer && (
              <Badge tone="warning" icon={AlertTriangle}>
                Needs payer
              </Badge>
            )}
            {needsSharers && (
              <Badge tone="warning" icon={AlertTriangle}>
                Needs sharers
              </Badge>
            )}
          </div>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
          {formatTaka(Number.parseFloat(item.price) || 0)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Dropdown
          label="Paid by"
          placeholder="Choose who paid"
          options={memberOptions.options.map((member) => ({ value: member.id, label: member.name }))}
          value={paidById}
          onChange={(id) => onChange({ paidByMemberId: id ?? '' })}
          error={showErrors && needsPayer ? 'Choose who paid for this item.' : undefined}
        />
        <MemberChipPicker
          label="Shared by"
          members={memberOptions.options}
          selected={sharedByIds}
          onChange={(ids) => onChange({ sharedByMemberIds: ids })}
          error={showErrors && needsSharers ? 'Pick at least one person sharing this item.' : undefined}
        />
      </div>
    </motion.li>
  )
}

/** The reveal once generation finishes: the AI's suggested list, reviewed and confirmed before it becomes real. */
export function GeneratedGroceries({ items, members, onAddGroceries, onReset }: GeneratedGroceriesProps) {
  const [drafts, setDrafts] = useState<GroceryItem[]>(() => items.map((item) => ({ ...item })))
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const memberOptions = useMemberOptions(members)

  const updateDraft = (id: string, patch: Partial<Pick<GroceryItem, 'paidByMemberId' | 'sharedByMemberIds'>>) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)))
  }

  const allResolved = drafts.every((item) => isFullyResolved(item, memberOptions))
  const unresolvedCount = drafts.filter((item) => !isFullyResolved(item, memberOptions)).length

  const handleAdd = async () => {
    if (submitting) return
    if (!allResolved) {
      setAttemptedSubmit(true)
      return
    }
    setSubmitting(true)
    setSubmitError(undefined)
    const result = await onAddGroceries(drafts)
    setSubmitting(false)
    if (result.error) setSubmitError(result.error)
    // Navigating away is the parent's job (App.tsx), once persistence is confirmed — no local action here either way.
  }

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
            {unresolvedCount > 0
              ? `Review who paid and who's sharing — GroceryMate never guesses this part.`
              : "Review the list, then add it to this week's groceries."}
          </p>
        </div>
        <Badge tone="mint" icon={Sparkles}>
          AI generated
        </Badge>
      </div>

      {submitError && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
          {submitError}
        </p>
      )}

      <motion.ul
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="space-y-2.5"
      >
        {drafts.map((item) => (
          <GeneratedItemReview
            key={item.id}
            item={item}
            memberOptions={memberOptions}
            showErrors={attemptedSubmit}
            onChange={(patch) => updateDraft(item.id, patch)}
          />
        ))}
      </motion.ul>

      {attemptedSubmit && !allResolved && (
        <p className="flex items-center gap-1.5 text-sm text-danger-700">
          <AlertTriangle size={15} aria-hidden="true" className="shrink-0" />
          {unresolvedCount === 1
            ? 'One item still needs a payer or sharers before you can add these.'
            : `${unresolvedCount} items still need a payer or sharers before you can add these.`}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button iconLeft={Check} onClick={handleAdd} disabled={submitting}>
          {submitting ? 'Adding…' : 'Add to groceries'}
        </Button>
        <Button variant="ghost" iconLeft={RotateCcw} onClick={onReset} disabled={submitting}>
          Try another prompt
        </Button>
      </div>
    </motion.div>
  )
}
