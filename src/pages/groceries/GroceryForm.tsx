import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Plus } from 'lucide-react'
import { Button, Dropdown, Input, Textarea } from '../../components/ui'
import { transitionFast, springSnappy } from '../../lib/motion'
import { mockMembers } from '../../data/mock'
import type { CategoryId, GroceryItem } from '../../data/groceries'
import { GroceryCard } from './GroceryCard'
import { CategoryPicker } from './CategoryPicker'
import { MemberChipPicker } from './MemberChipPicker'

export type GroceryDraft = Omit<GroceryItem, 'id'>

interface GroceryFormProps {
  /** Item being edited, or null when adding. */
  initial: GroceryItem | null
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

/** Entry panel body: live preview on top, fields below. Purely visual. */
export function GroceryForm({ initial, onSubmit, onCancel }: GroceryFormProps) {
  const editing = initial != null
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1)
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'produce')
  const [paidBy, setPaidBy] = useState<string | null>(initial?.paidBy ?? mockMembers[0])
  const [sharedBy, setSharedBy] = useState<string[]>(initial?.sharedBy ?? [...mockMembers])
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const draft: GroceryItem = {
    id: initial?.id ?? 'preview',
    name,
    price,
    quantity,
    category,
    paidBy: paidBy ?? '',
    sharedBy,
    notes,
  }

  const handlePriceChange = (next: string) => {
    // Input masking only; no math happens here.
    if (/^\d*\.?\d{0,2}$/.test(next)) setPrice(next)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      price,
      quantity,
      category,
      paidBy: paidBy ?? '',
      sharedBy,
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-2">
      <motion.div layout transition={transitionFast}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Live preview
        </p>
        <GroceryCard item={draft} preview />
      </motion.div>

      <Input
        label="Grocery name"
        placeholder="e.g. Milk (2L)"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
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
        label="Paid by"
        placeholder="Choose a member"
        options={mockMembers.map((member) => ({ value: member, label: member }))}
        value={paidBy}
        onChange={setPaidBy}
      />

      <MemberChipPicker
        label="Shared by"
        members={mockMembers}
        selected={sharedBy}
        onChange={setSharedBy}
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
        <Button type="submit" disabled={!name.trim()} iconLeft={editing ? Check : Plus}>
          {editing ? 'Save changes' : 'Add grocery'}
        </Button>
      </div>
    </form>
  )
}
