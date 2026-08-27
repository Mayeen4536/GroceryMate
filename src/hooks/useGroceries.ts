import { useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { initialGroceries } from '@/store/groceries'
import type { GroceryItem } from '@/types/grocery'

/** The shape a grocery form submits: every field except the generated id. */
export type GroceryDraft = Omit<GroceryItem, 'id'>

/** A recently-deleted item, kept around long enough to undo. */
export interface PendingDelete {
  id: string
  name: string
}

/** How long an "Undo" toast stays actionable before the delete is final. */
const UNDO_WINDOW_MS = 5000

/** Owns the Groceries feature's state: the list, the add/edit panel, and their handlers. */
export function useGroceries() {
  const [items, setItems] = useState<GroceryItem[]>(initialGroceries)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([])
  // Full deleted item + its original index + timer, keyed by id — the single
  // source of truth for "can this still be undone", checked synchronously so
  // a repeated Undo click (or the window expiring mid-click) can't restore
  // the same item twice. `pendingDeletes` above is just the derived list for
  // rendering the toast stack.
  const pendingRef = useRef<Map<string, { item: GroceryItem; index: number; timeoutId: ReturnType<typeof setTimeout> }>>(
    new Map(),
  )

  const editingItem = items.find((item) => item.id === editingId) ?? null
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const openAdd = () => {
    setEditingId(null)
    setPanelOpen(true)
  }

  const openEdit = (id: string) => {
    setEditingId(id)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingId(null)
  }

  const handleSubmit = (draft: GroceryDraft) => {
    if (editingItem) {
      setItems((current) =>
        current.map((item) => (item.id === editingItem.id ? { ...item, ...draft } : item)),
      )
    } else {
      const id = `g-${Date.now()}`
      setItems((current) => [{ id, ...draft }, ...current])
      setLastAddedId(id)
    }
    closePanel()
  }

  /** Removes the item immediately, but keeps it recoverable for `UNDO_WINDOW_MS`. */
  const handleDelete = (id: string) => {
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return
    const item = items[index]

    setItems((current) => current.filter((current_) => current_.id !== id))
    setPendingDeletes((current) => [...current, { id, name: item.name || 'New grocery' }])

    const timeoutId = setTimeout(() => {
      pendingRef.current.delete(id)
      setPendingDeletes((current) => current.filter((entry) => entry.id !== id))
    }, UNDO_WINDOW_MS)
    pendingRef.current.set(id, { item, index, timeoutId })
  }

  /** Restores a deleted item to its original position, if its undo window hasn't closed. */
  const undoDelete = (id: string) => {
    const entry = pendingRef.current.get(id)
    if (!entry) return // already restored, dismissed, or expired — ignore a duplicate/late click
    clearTimeout(entry.timeoutId)
    pendingRef.current.delete(id)
    setPendingDeletes((current) => current.filter((pending) => pending.id !== id))
    setItems((current) => {
      const insertAt = Math.min(entry.index, current.length)
      return [...current.slice(0, insertAt), entry.item, ...current.slice(insertAt)]
    })
  }

  /** Dismisses a delete toast early, making that deletion final right away. */
  const dismissDelete = (id: string) => {
    const entry = pendingRef.current.get(id)
    if (!entry) return
    clearTimeout(entry.timeoutId)
    pendingRef.current.delete(id)
    setPendingDeletes((current) => current.filter((pending) => pending.id !== id))
  }

  /**
   * Appends a batch of AI-suggested items (e.g. from the Assistant) once
   * they've already been reviewed and confirmed — GroceryMate never invents
   * a payer or sharers on its own (that's a product principle, not just an
   * implementation detail), so by the time items reach here every one of
   * them must already have a real `paidBy` and non-empty `sharedBy`; the
   * Assistant's review step (`GeneratedGroceries`) is what enforces that
   * before this is ever called. This just re-keys them and adds them.
   */
  const addGenerated = (generated: GroceryItem[]) => {
    const reKeyed = generated.map((item, index) => ({
      ...item,
      id: `g-${Date.now()}-${index}`,
    }))
    setItems((current) => [...reKeyed, ...current])
    setLastAddedId(reKeyed[0]?.id ?? null)
  }

  return {
    items,
    panelOpen,
    editingItem,
    lastAddedId,
    isDesktop,
    pendingDeletes,
    openAdd,
    openEdit,
    closePanel,
    handleSubmit,
    handleDelete,
    undoDelete,
    dismissDelete,
    addGenerated,
  }
}
