import { useCallback, useRef, useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useHouseholdGroceries, type GroceryDraft } from '@/groceries/useHouseholdGroceries'
import type { GroceryItem } from '@/types/grocery'

export type { GroceryDraft } from '@/groceries/useHouseholdGroceries'

/** A recently-deleted item, kept around long enough to undo. */
export interface PendingDelete {
  id: string
  name: string
}

/** How long an "Undo" toast stays actionable before the delete is final. */
const UNDO_WINDOW_MS = 5000

/**
 * Owns the Groceries feature's state: the list (real, Supabase-backed via
 * `useHouseholdGroceries`), the add/edit panel, and delete/undo. Preserves
 * the pre-existing hook API (`items`, `handleSubmit`, `handleDelete`,
 * `undoDelete`, `dismissDelete`, `addGenerated`, …) so `GroceriesPage`/
 * `App.tsx` didn't need to change shape, adding only `loading`/`error`/
 * `refresh`/`deleteError` on top — see docs/GROCERY_INTEGRATION.md.
 *
 * Delete/undo strategy: deleting never calls Supabase immediately. The
 * item is only optimistically hidden from `items` (via `pendingDeletes`)
 * for `UNDO_WINDOW_MS` — Undo during that window is a pure client-side
 * cancel, no network call, so there is nothing to "restore" and no way to
 * double-restore. The real, persisted delete happens only once the window
 * closes (or the toast is dismissed early) — see `finalizeDelete`. This
 * means a page refresh *during* the undo window shows the item again (the
 * server never had the delete), which is the correct, truthful outcome —
 * "delete" only ever becomes irreversible once actually persisted.
 */
export function useGroceries() {
  const { groceries, loading, error, refresh, addGrocery, editGrocery, deleteGrocery } = useHouseholdGroceries()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([])
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  // Timer only — unlike the old local-only version, there's no snapshot to
  // hold here: the item being "deleted" is still sitting untouched in
  // `groceries` (Supabase's own state) for the entire undo window.
  const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const hiddenIds = new Set(pendingDeletes.map((pending) => pending.id))
  const items = groceries.filter((item) => !hiddenIds.has(item.id))
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

  const handleSubmit = async (draft: GroceryDraft): Promise<{ error?: string }> => {
    if (editingItem) {
      const result = await editGrocery(editingItem.id, draft)
      if (!result.error) closePanel()
      return result
    }
    const result = await addGrocery(draft)
    if (!result.error && result.id) {
      setLastAddedId(result.id)
      closePanel()
    }
    return result
  }

  /** Runs the real, persisted delete — called once the undo window actually closes, never by `undoDelete`. */
  const finalizeDelete = useCallback(
    async (id: string) => {
      const result = await deleteGrocery(id)
      pendingRef.current.delete(id)
      setPendingDeletes((current) => current.filter((pending) => pending.id !== id))
      if (result.error) {
        // The grocery is still genuinely persisted — it reappears in
        // `items` on its own the instant it's out of `pendingDeletes`
        // above, so there is nothing to restore here, only to explain.
        setDeleteError({ id, message: result.error })
      }
    },
    [deleteGrocery],
  )

  /** Optimistically hides the item and starts its undo window — no network call yet. */
  const handleDelete = (id: string) => {
    if (pendingRef.current.has(id)) return // already pending — a rapid double-click on the same delete button
    const item = groceries.find((current) => current.id === id)
    if (!item) return

    setDeleteError((current) => (current?.id === id ? null : current))
    setPendingDeletes((current) => [...current, { id, name: item.name || 'New grocery' }])
    const timeoutId = setTimeout(() => {
      void finalizeDelete(id)
    }, UNDO_WINDOW_MS)
    pendingRef.current.set(id, timeoutId)
  }

  /** Cancels the pending delete — purely local, nothing was ever persisted, so nothing to restore. */
  const undoDelete = (id: string) => {
    const timeoutId = pendingRef.current.get(id)
    if (timeoutId === undefined) return // already finalized, dismissed, or expired — ignore a duplicate/late click
    clearTimeout(timeoutId)
    pendingRef.current.delete(id)
    setPendingDeletes((current) => current.filter((pending) => pending.id !== id))
  }

  /** Dismisses a delete toast early, making that deletion final (and persisted) right away instead of waiting out the window. */
  const dismissDelete = (id: string) => {
    const timeoutId = pendingRef.current.get(id)
    if (timeoutId === undefined) return
    clearTimeout(timeoutId)
    void finalizeDelete(id)
  }

  const dismissDeleteError = () => setDeleteError(null)

  /**
   * Persists a batch of already-reviewed AI-suggested items through the
   * exact same `addGrocery` path manual entry uses — no second persistence
   * pathway. By the time items reach here every one of them must already
   * have a real `paidByMemberId` and non-empty `sharedByMemberIds`;
   * `GeneratedGroceries`' own review step is what enforces that (GroceryMate
   * never invents a payer or sharers on its own). Added sequentially rather
   * than in parallel so a failure partway through is unambiguous about
   * which items actually made it in — the ones already awaited did.
   */
  const addGenerated = async (generated: GroceryItem[]): Promise<{ error?: string; addedCount: number }> => {
    let addedCount = 0
    let firstId: string | null = null
    let firstError: string | undefined
    for (const item of generated) {
      const result = await addGrocery({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        paidByMemberId: item.paidByMemberId,
        sharedByMemberIds: item.sharedByMemberIds,
        notes: item.notes,
      })
      if (result.error) {
        firstError = firstError ?? result.error
        continue
      }
      addedCount += 1
      firstId = firstId ?? result.id ?? null
    }
    if (firstId) setLastAddedId(firstId)
    return { error: firstError, addedCount }
  }

  return {
    items,
    loading,
    error,
    refresh,
    panelOpen,
    editingItem,
    lastAddedId,
    isDesktop,
    pendingDeletes,
    deleteError,
    openAdd,
    openEdit,
    closePanel,
    handleSubmit,
    handleDelete,
    undoDelete,
    dismissDelete,
    dismissDeleteError,
    addGenerated,
  }
}
