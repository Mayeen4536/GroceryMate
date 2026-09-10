import { useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { Button, Dropdown, Input, Textarea } from '@/components/ui'
import { transitionFast, springSnappy } from '@/animations/motion'
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
  onSubmit: (draft: GroceryDraft) => void
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
 * Resolves an existing item's stored payer/sharer names (see `src/adapters`
 * for why grocery data is name-keyed) to the current roster's ids, for
 * pre-filling the pickers below. A name that no longer matches exactly one
 * current, selectable member — removed, renamed, or now ambiguous — is
 * simply left out rather than guessed at; the picker can only ever offer
 * ids it actually has an option for.
 */
function resolveInitialSelection(initial: GroceryItem | null, memberOptions: ReturnType<typeof useMemberOptions>) {
  if (!initial) return { paidById: null, sharedByIds: [] as string[] }
  return {
    paidById: memberOptions.resolveIdForName(initial.paidBy),
    sharedByIds: initial.sharedBy
      .map((name) => memberOptions.resolveIdForName(name))
      .filter((id): id is string => id !== null),
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
  const formRef = useRef<HTMLFormElement>(null)
  const sharedByGroupRef = useRef<HTMLDivElement>(null)

  const nameError = attemptedSubmit && !name.trim() ? 'Enter a name for this item.' : undefined
  const paidByError = attemptedSubmit && !paidById ? 'Choose who paid for this item.' : undefined
  const sharedByError =
    attemptedSubmit && sharedByIds.length === 0 ? 'Pick at least one person sharing this item.' : undefined

  const draft: GroceryItem = {
    id: initial?.id ?? 'preview',
    name,
    price,
    quantity,
    category,
    paidBy: memberOptions.nameForId(paidById),
    sharedBy: sharedByIds.map((id) => memberOptions.nameForId(id)),
    notes,
  }

  const handlePriceChange = (next: string) => {
    // Input masking only; no math happens here.
    if (/^\d*\.?\d{0,2}$/.test(next)) setPrice(next)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !paidById || sharedByIds.length === 0) {
      setAttemptedSubmit(true)
      // Move focus to the first invalid field, same as native constraint
      // validation would have — but reliably, since noValidate below stops
      // the browser from doing (and getting in the way of) that itself.
      if (!name.trim()) {
        formRef.current?.querySelector<HTMLInputElement>('#grocery-form-name')?.focus()
      } else if (!paidById) {
        formRef.current?.querySelector<HTMLButtonElement>('#grocery-form-paid-by')?.focus()
      } else {
        sharedByGroupRef.current?.focus()
      }
      return
    }
    onSubmit({
      name: name.trim(),
      price,
      quantity,
      category,
      paidBy: memberOptions.nameForId(paidById),
      sharedBy: sharedByIds.map((id) => memberOptions.nameForId(id)),
      notes: notes.trim(),
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 pb-2">
      <motion.div layout transition={transitionFast}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Live preview
        </p>
        <GroceryCard item={draft} preview />
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
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price"
          placeholder="0"
          inputMode="decimal"
          value={price}
          onChange={(event) => handlePriceChange(event.target.value)}
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
      />

      <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" iconLeft={editing ? Check : Plus}>
          {editing ? 'Save changes' : 'Add grocery'}
        </Button>
      </div>
    </form>
  )
}
