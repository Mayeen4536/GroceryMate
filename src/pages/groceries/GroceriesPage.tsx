import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, ShoppingBasket } from 'lucide-react'
import { Badge, Drawer } from '../../components/ui'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageTransition } from '../../components/layout/PageTransition'
import { riseChild, springGentle, transitionBase } from '../../lib/motion'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { initialGroceries, type GroceryItem } from '../../data/groceries'
import { GroceryCard } from './GroceryCard'
import { GroceryForm, type GroceryDraft } from './GroceryForm'
import { GroceriesEmptyState } from './EmptyState'

/**
 * The Grocery Flow: list, entry panel with live preview, floating CTA.
 * All state is visual mock state; calculations arrive with business logic.
 */
export function GroceriesPage({ direction = 1 }: { direction?: number }) {
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

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="Groceries"
            description="Every item your household added, who paid, and who shared it."
            action={
              items.length > 0 ? (
                <Badge tone="neutral" icon={ShoppingBasket}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Badge>
              ) : undefined
            }
          />
        </motion.div>

        <motion.div variants={riseChild}>
          {items.length === 0 ? (
            <GroceriesEmptyState onAdd={openAdd} />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                    transition={transitionBase}
                  >
                    <GroceryCard
                      item={item}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      highlight={item.id === lastAddedId}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </PageTransition>

      {/* Floating CTA. Lives outside the page transform so `fixed` means the viewport. */}
      <motion.button
        type="button"
        onClick={openAdd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { ...springGentle, delay: 0.25 } }}
        exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={springGentle}
        className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-linear-to-b from-brand-500 to-brand-700 pl-5 pr-6 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_2px_6px_rgb(16_58_38/0.3),0_10px_28px_-6px_rgb(33_122_80/0.55)] transition-[filter] duration-200 hover:brightness-[1.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:bottom-8 lg:right-8"
      >
        <Plus size={19} aria-hidden="true" />
        Add grocery
      </motion.button>

      <Drawer
        open={panelOpen}
        onClose={closePanel}
        title={editingItem ? 'Edit grocery' : 'Add grocery'}
        side={isDesktop ? 'right' : 'bottom'}
        panelClassName="sm:max-w-md"
      >
        <GroceryForm
          key={editingItem?.id ?? 'new'}
          initial={editingItem}
          onSubmit={handleSubmit}
          onCancel={closePanel}
        />
      </Drawer>
    </>
  )
}
