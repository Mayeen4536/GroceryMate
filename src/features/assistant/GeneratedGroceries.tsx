import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, RotateCcw, Sparkles } from 'lucide-react'
import { Badge, Button, Dropdown } from '@/components/ui'
import { riseChild, staggerChildren, transitionBase } from '@/animations/motion'
import { mockMembers } from '@/store/household'
import { categoryById } from '@/utils/groceryCategory'
import { formatTaka } from '@/utils/money'
import type { GroceryItem } from '@/types/grocery'
import { MemberChipPicker } from '@/features/groceries/MemberChipPicker'

interface GeneratedGroceriesProps {
  items: GroceryItem[]
  onAddGroceries: (items: GroceryItem[]) => void
  onReset: () => void
}

const PAYER_OPTIONS = mockMembers.map((member) => ({ value: member, label: member }))

/**
 * One generated item, editable in place. AI-suggested items may not state
 * who paid or who it's for — GroceryMate never guesses either; whatever's
 * missing here is visibly flagged and must be filled in before it can join
 * the real list.
 */
function GeneratedItemReview({
  item,
  showErrors,
  onChange,
}: {
  item: GroceryItem
  showErrors: boolean
  onChange: (patch: Partial<Pick<GroceryItem, 'paidBy' | 'sharedBy'>>) => void
}) {
  const category = categoryById(item.category)
  const needsPayer = !item.paidBy
  const needsSharers = item.sharedBy.length === 0

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
          options={PAYER_OPTIONS}
          value={item.paidBy || null}
          onChange={(paidBy) => onChange({ paidBy })}
          error={showErrors && needsPayer ? 'Choose who paid for this item.' : undefined}
        />
        <MemberChipPicker
          label="Shared by"
          members={mockMembers}
          selected={item.sharedBy}
          onChange={(sharedBy) => onChange({ sharedBy })}
          error={showErrors && needsSharers ? 'Pick at least one person sharing this item.' : undefined}
        />
      </div>
    </motion.li>
  )
}

/** The reveal once generation finishes: the AI's suggested list, reviewed and confirmed before it becomes real. */
export function GeneratedGroceries({ items, onAddGroceries, onReset }: GeneratedGroceriesProps) {
  const [drafts, setDrafts] = useState<GroceryItem[]>(() => items.map((item) => ({ ...item })))
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const updateDraft = (id: string, patch: Partial<Pick<GroceryItem, 'paidBy' | 'sharedBy'>>) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)))
  }

  const isResolved = (item: GroceryItem) => Boolean(item.paidBy) && item.sharedBy.length > 0
  const allResolved = drafts.every(isResolved)
  const unresolvedCount = drafts.filter((item) => !isResolved(item)).length

  const handleAdd = () => {
    if (!allResolved) {
      setAttemptedSubmit(true)
      return
    }
    onAddGroceries(drafts)
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
        <Button iconLeft={Check} onClick={handleAdd}>
          Add to groceries
        </Button>
        <Button variant="ghost" iconLeft={RotateCcw} onClick={onReset}>
          Try another prompt
        </Button>
      </div>
    </motion.div>
  )
}
