import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Apple, Carrot, Egg, Plus, ShoppingBasket } from 'lucide-react'
import { Badge, Button, Card, Drawer, Toast } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, springGentle, transitionBase } from '@/animations/motion'
import { useHousehold } from '@/household/useHousehold'
import type { useGroceries } from '@/hooks/useGroceries'
import { buildMemberNameResolver } from '@/members/resolveMemberName'
import type { Member } from '@/types/member'
import { GroceryCard } from './GroceryCard'
import { GroceryForm } from './GroceryForm'

/**
 * The Grocery Flow: list, entry panel with live preview, floating CTA.
 * Groceries are real, Supabase-backed data (see docs/GROCERY_INTEGRATION.md).
 *
 * Takes `useGroceries()`'s return value as props rather than calling the
 * hook itself — the Assistant page needs to add to this same list, so the
 * state lives once in `App.tsx` and both pages share it. `members` is
 * threaded through the same way: the add/edit form's payer and shared-by
 * pickers, and this page's own id → display-name resolution, both read
 * from the current household roster.
 */
export function GroceriesPage({
  direction = 1,
  members,
  ...groceries
}: { direction?: number; members: readonly Member[] } & ReturnType<typeof useGroceries>) {
  const {
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
  } = groceries

  // RLS is the real authority (creator or household owner may edit/delete —
  // see Migration 3's grocery_items_update_creator_or_owner /
  // _delete_creator_or_owner) — this only hides controls a caller couldn't
  // successfully use anyway.
  const { currentMembership } = useHousehold()
  const isOwner = currentMembership?.role === 'owner'

  // Includes archived members deliberately — a grocery logged before a
  // member was archived must still show their real name, never "Unknown
  // member" just because they're no longer active (see
  // docs/GROCERY_INTEGRATION.md's archived-member historical behavior).
  const memberNameById = useMemo(() => {
    const resolve = buildMemberNameResolver(members)
    return resolve
  }, [members])

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

        {loading ? (
          <motion.div variants={riseChild} className="flex justify-center py-16">
            <div
              role="status"
              aria-label="Loading groceries"
              className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
            />
          </motion.div>
        ) : error ? (
          // Never fabricate a grocery list on failure — a real error state,
          // not an empty-household state, so it's distinguishable and retryable.
          <motion.div variants={riseChild}>
            <Card padding="lg">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm font-semibold text-ink">Couldn't load groceries</p>
                <p className="text-sm text-ink-soft">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={riseChild}>
            {items.length === 0 ? (
              <EmptyState
                icon={ShoppingBasket}
                tileClassName="from-brand-100 to-mint-100 text-brand-700"
                glowClassName="bg-brand-500/10"
                ringClassName="border-brand-300/50"
                orbitChips={[
                  { icon: Apple, toneClassName: 'text-danger-500' },
                  { icon: Carrot, toneClassName: 'text-warning-500' },
                  { icon: Egg, toneClassName: 'text-member-gold-strong' },
                ]}
                title="Your first grocery starts here."
                description="Add groceries and GroceryMate will take care of the math."
                action={
                  <Button iconLeft={Plus} onClick={openAdd}>
                    Add your first grocery
                  </Button>
                }
              />
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
                        memberNameById={memberNameById}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        canEdit={isOwner || item.createdByMemberId === currentMembership?.id}
                        highlight={item.id === lastAddedId}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        )}
      </PageTransition>

      {/* Floating CTA. Lives outside the page transform so `fixed` means the viewport.
          Hidden while the add/edit drawer is open, so its own exit animation can fire
          instead of sitting behind the drawer unnoticed. */}
      <AnimatePresence>
        {!panelOpen && (
          <motion.button
            type="button"
            onClick={openAdd}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { ...springGentle, delay: 0.25 } }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={springGentle}
            className="fixed right-4 bottom-[var(--mobile-nav-clearance)] z-40 flex h-14 items-center gap-2 rounded-full bg-linear-to-b from-brand-500 to-brand-700 pl-5 pr-6 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_2px_6px_rgb(16_58_38/0.3),0_10px_28px_-6px_rgb(33_122_80/0.55)] transition-[filter] duration-200 hover:brightness-[1.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:right-8 lg:bottom-8"
          >
            <Plus size={19} aria-hidden="true" />
            Add grocery
          </motion.button>
        )}
      </AnimatePresence>

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
          members={members}
          onSubmit={handleSubmit}
          onCancel={closePanel}
        />
      </Drawer>

      {/* Undo toasts for deleted items, plus a plain (non-actionable) toast
          for a delete that failed to finalize — the item is still real and
          persisted, so it's back in the list above; this just explains why. */}
      <div className="pointer-events-none fixed inset-x-4 z-40 flex flex-col items-start gap-2 bottom-[calc(var(--mobile-nav-clearance)+4rem)] lg:bottom-24">
        <AnimatePresence initial={false}>
          {pendingDeletes.map((pending) => (
            <Toast
              key={pending.id}
              message={`${pending.name} deleted`}
              actionLabel="Undo"
              onAction={() => undoDelete(pending.id)}
              onDismiss={() => dismissDelete(pending.id)}
            />
          ))}
          {deleteError && (
            <Toast
              key={`delete-error-${deleteError.id}`}
              message={`Couldn't delete that item: ${deleteError.message}`}
              onDismiss={dismissDeleteError}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
