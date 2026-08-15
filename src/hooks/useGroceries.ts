import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { initialGroceries } from '@/store/groceries'
import { mockMembers, mockUser } from '@/store/household'
import type { GroceryItem } from '@/types/grocery'

/** The shape a grocery form submits: every field except the generated id. */
export type GroceryDraft = Omit<GroceryItem, 'id'>

/** Owns the Groceries feature's state: the list, the add/edit panel, and their handlers. */
export function useGroceries() {
  const [items, setItems] = useState<GroceryItem[]>(initialGroceries)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

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

  const handleDelete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  /**
   * Appends a batch of AI-suggested items (e.g. from the Assistant), filling
   * in a payer/sharers when the source didn't have any yet — an AI
   * suggestion has no real payer or sharers until a member reviews it, so
   * this fills in the sensible default (whoever's using the app, shared by
   * the whole household) rather than leaving items with no one attached.
   */
  const addGenerated = (generated: GroceryItem[]) => {
    const withDefaults = generated.map((item, index) => ({
      ...item,
      id: `g-${Date.now()}-${index}`,
      paidBy: item.paidBy || mockUser.name,
      sharedBy: item.sharedBy.length > 0 ? item.sharedBy : mockMembers,
    }))
    setItems((current) => [...withDefaults, ...current])
    setLastAddedId(withDefaults[0]?.id ?? null)
  }

  return {
    items,
    panelOpen,
    editingItem,
    lastAddedId,
    isDesktop,
    openAdd,
    openEdit,
    closePanel,
    handleSubmit,
    handleDelete,
    addGenerated,
  }
}
