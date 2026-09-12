import { useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { Button, Dropdown, Input, Textarea } from '@/components/ui'
import { transitionFast, springSnappy } from '@/animations/motion'
import { parseMoneyInput } from '@/adapters'
import { useHousehold } from '@/household/useHousehold'
import { type GroceryDraft } from '@/hooks/useGroceries'
import { useMemberOptions } from '@/hooks/useMemberOptions'
import type { CategoryId, GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import { GroceryCard } from './GroceryCard'
import { CategoryPicker } from './CategoryPicker'
import { MemberChipPicker } from './MemberChipPicker'

interface GroceryFormProps {
  /** Item being edited, or null when adding. */
  initial: GroceryItem | null
  /** The household's current roster — the only source financial participant selection reads from. */
  members: readonly Member[]
  onSubmit: (draft: GroceryDraft) => Promise<{ error?: string }>
  onCancel: () => void
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const stepButton =
    'flex size-8 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-sand hover:text-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40'
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">Quantity</span>
      <div className="flex h-11 items-center justify-between rounded-md border border-line-strong bg-surface px-1.5 shadow-[0_1px_2px_rgb(30_26_22/0.03)]">
        <motion.button
          type="button"
          aria-label="Decrease quantity"
          whileTap={{ scale: 0.85 }}
          transition={springSnappy}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          className={stepButton}
        >
          <Minus size={15} aria-hidden="true" />
        </motion.button>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={transitionFast}
            className="text-sm font-semibold tabular-nums text-ink"
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <motion.button
          type="button"
          aria-label="Increase quantity"
          whileTap={{ scale: 0.85 }}
          transition={springSnappy}
          disabled={value >= 99}
          onClick={() => onChange(value + 1)}
          className={stepButton}
        >
          <Plus size={15} aria-hidden="true" />
        </motion.button>
      </div>
    </div>
  )
}

/**
 * An existing item's persisted payer/sharer ids, filtered to whichever of
 * them still match a *current, selectable* member — one that's since been
 * archived or removed is simply left out of the pre-fill rather than kept
 * (the picker can only ever offer an id it actually has an option for; the
 * item's real persisted reference is untouched either way until the user
 * explicitly changes and re-submits the form).
 */
function resolveInitialSelection(initial: GroceryItem | null, memberOptions: ReturnType<typeof useMemberOptions>) {
  if (!initial) return { paidById: null, sharedByIds: [] as string[] }
  const selectableIds = new Set(memberOptions.options.map((option) => option.id))
  return {
    paidById: selectableIds.has(initial.paidByMemberId) ? initial.paidByMemberId : null,
    sharedByIds: initial.sharedByMemberIds.filter((id) => selectableIds.has(id)),
  }
}

/** Entry panel body: live preview on top, fields below. Purely visual. */
export function GroceryForm({ initial, members, onSubmit, onCancel }: GroceryFormProps) {
  const editing = initial != null
  const memberOptions = useMemberOptions(members)
  // The signed-in user's own household_members.id (same id space as
  // memberOptions, both from the same table) — not a name match, which
  // would only ever coincidentally work and breaks entirely once real
  // members replace the fixed mock roster.
  const { currentMembership } = useHousehold()
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1)
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'produce')
  const [paidById, setPaidById] = useState<string | null>(() => {
    if (initial) return resolveInitialSelection(initial, memberOptions).paidById
    const currentUserOption = memberOptions.options.find((option) => option.id === currentMembership?.id)
    return currentUserOption?.id ?? memberOptions.options[0]?.id ?? null
  })
  const [sharedByIds, setSharedByIds] = useState<string[]>(() => {
    if (initial) return resolveInitialSelection(initial, memberOptions).sharedByIds
    return memberOptions.options.map((option) => option.id)
  })
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const formRef = useRef<HTMLFormElement>(null)
  const sharedByGroupRef = useRef<HTMLDivElement>(null)

  const nameError = attemptedSubmit && !name.trim() ? 'Enter a name for this item.' : undefined
  // A real, persisted amount_minor requires a genuinely parseable price —
  // unlike the old mock-only form, a blank price can no longer silently
  // become "free" (that would understate real spending, the exact kind of
  // silent guess this app avoids everywhere else too).
  const priceError = attemptedSubmit && !parseMoneyInput(price).ok ? 'Enter a valid price.' : undefined
  const paidByError = attemptedSubmit && !paidById ? 'Choose who paid for this item.' : undefined
  const sharedByError =
    attemptedSubmit && sharedByIds.length === 0 ? 'Pick at least one person sharing this item.' : undefined

  const draft: GroceryItem = {
    id: initial?.id ?? 'preview',
    name,
    price,
    quantity,
    category,
    paidByMemberId: paidById ?? '',
    sharedByMemberIds: sharedByIds,
    createdByMemberId: initial?.createdByMemberId ?? currentMembership?.id ?? '',
    notes,
    createdAt: initial?.createdAt ?? '',
  }

  const handlePriceChange = (next: string) => {
    // Input masking only; no math happens here.
    if (/^\d*\.?\d{0,2}$/.test(next)) setPrice(next)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return // belt-and-suspenders against a double Enter+click race; disabled below is the primary guard
    const priceIsValid = parseMoneyInput(price).ok
    if (!name.trim() || !priceIsValid || !paidById || sharedByIds.length === 0) {
      setAttemptedSubmit(true)
      // Move focus to the first invalid field, same as native constraint
      // validation would have — but reliably, since noValidate below stops
      // the browser from doing (and getting in the way of) that itself.
      if (!name.trim()) {
        formRef.current?.querySelector<HTMLInputElement>('#grocery-form-name')?.focus()
      } else if (!priceIsValid) {
        formRef.current?.querySelector<HTMLInputElement>('#grocery-form-price')?.focus()
      } else if (!paidById) {
        formRef.current?.querySelector<HTMLButtonElement>('#grocery-form-paid-by')?.focus()
      } else {
        sharedByGroupRef.current?.focus()
      }
      return
    }
    setSubmitting(true)
    setSubmitError(undefined)
    const result = await onSubmit({
      name: name.trim(),
      price,
      quantity,
      category,
      paidByMemberId: paidById,
      sharedByMemberIds: sharedByIds,
      notes: notes.trim(),
    })
    setSubmitting(false)
    if (result.error) setSubmitError(result.error)
    // onCancel()/closing the panel is the parent's job (see useGroceries'
    // handleSubmit) once the write is confirmed persisted — no local close here.
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 pb-2">
      {submitError && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
          {submitError}
        </p>
      )}

      <motion.div layout transition={transitionFast}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Live preview
        </p>
        <GroceryCard item={draft} memberNameById={memberOptions.nameForId} preview />
      </motion.div>

      <Input
        id="grocery-form-name"
        label="Grocery name"
        placeholder="e.g. Milk (2L)"
        autoFocus
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={nameError}
        disabled={submitting}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="grocery-form-price"
          label="Price"
          placeholder="0"
          inputMode="decimal"
          value={price}
          onChange={(event) => handlePriceChange(event.target.value)}
          error={priceError}
          disabled={submitting}
        />
        <QuantityStepper value={quantity} onChange={setQuantity} />
      </div>

      <CategoryPicker value={category} onChange={setCategory} />

      <Dropdown
        id="grocery-form-paid-by"
        label="Paid by"
        placeholder="Choose a member"
        options={memberOptions.options.map((member) => ({ value: member.id, label: member.name }))}
        value={paidById}
        onChange={setPaidById}
        error={paidByError}
      />

      <MemberChipPicker
        label="Shared by"
        members={memberOptions.options}
        selected={sharedByIds}
        onChange={setSharedByIds}
        error={sharedByError}
        groupRef={sharedByGroupRef}
      />

      <Textarea
        label="Notes"
        placeholder="Anything the household should know…"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        disabled={submitting}
      />

      <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" iconLeft={editing ? Check : Plus} disabled={submitting}>
          {submitting ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save changes' : 'Add grocery'}
        </Button>
      </div>
    </form>
  )
}
