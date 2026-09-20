import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Search, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Card, Input, SegmentedControl } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { FinancialDataError } from '@/components/FinancialDataError'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useHousehold } from '@/household/useHousehold'
import { useSettlementResult } from '@/hooks/useSettlementResult'
import type { useMembers } from '@/hooks/useMembers'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'
import type { SettlementViewModel } from '@/adapters'
import { MemberCard } from './MemberCard'
import { AddMemberDialog } from './AddMemberDialog'
import { MemberProfileDrawer } from './MemberProfileDrawer'

/**
 * Overrides a member's `amountPaid`/`status`/`itemsAdded` with real values
 * derived from the actual persisted groceries — `MemberCard`/
 * `MemberProfileDrawer` keep reading a plain `Member`, unaware any
 * calculation happened at all. `itemsAdded` counts real `grocery_items`
 * rows this member logged (`createdByMemberId`, independent of who paid or
 * shared it — see docs/GROCERY_INTEGRATION.md); it's real regardless of
 * whether the settlement calculation itself succeeded, since counting
 * needs no balance math.
 *
 * `status` is only ever overwritten for a member with no membership-
 * lifecycle status of their own yet (the placeholder 'settled' every
 * fresh active member starts with) — the engine includes archived and
 * invited members in its balance output too (so a grocery that already
 * references one stays resolvable), but 'archived'/'invited' are real,
 * persisted states that must win over a computed financial one, or an
 * archived member's card would silently stop reading as archived the
 * moment they had any historical balance.
 */
function withRealFinancials(
  member: Member,
  groceries: readonly GroceryItem[],
  viewModel: SettlementViewModel | null,
): Member {
  const itemsAdded = groceries.filter((item) => item.createdByMemberId === member.id).length
  const financials = viewModel?.memberFinancials.find((entry) => entry.memberId === member.id)
  if (!financials) return { ...member, itemsAdded }
  if (member.status === 'archived' || member.status === 'invited') {
    return { ...member, itemsAdded, amountPaid: financials.amountPaid }
  }
  return { ...member, itemsAdded, amountPaid: financials.amountPaid, status: financials.status }
}

interface MembersPageProps {
  direction?: number
  groceries: readonly GroceryItem[]
}

/** The Members experience: each member's financial summary derived from the real settlement engine. */
export function MembersPage({
  direction = 1,
  groceries,
  members,
  loading,
  error,
  refresh,
  search,
  setSearch,
  sortBy,
  setSortBy,
  dialogOpen,
  dialogTab,
  profileMember,
  lastAddedId,
  visibleMembers,
  openDialog,
  closeDialog,
  setProfileId,
  handleAdd,
  handleChangeTone,
  handleRemove,
  handleReactivate,
}: MembersPageProps & ReturnType<typeof useMembers>) {
  const settlementResult = useSettlementResult(members, groceries)
  // RLS is the real authorization boundary (Migration 3) — this only hides
  // controls a non-owner couldn't successfully use anyway.
  const { currentMembership } = useHousehold()
  const isOwner = currentMembership?.role === 'owner'

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="Members"
            description="The people sharing this household."
            action={
              isOwner ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => openDialog('invite')}>
                    Invite
                  </Button>
                  <Button size="sm" iconLeft={UserPlus} onClick={() => openDialog('add')}>
                    Add member
                  </Button>
                </>
              ) : undefined
            }
          />
        </motion.div>

        {loading ? (
          <motion.div variants={riseChild} className="flex justify-center py-16">
            <div
              role="status"
              aria-label="Loading members"
              className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600"
            />
          </motion.div>
        ) : error ? (
          // Never fabricate a roster on failure — a real error state, not
          // an empty-household state, so it's distinguishable and retryable.
          <motion.div variants={riseChild}>
            <Card padding="lg">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm font-semibold text-ink">Couldn't load members</p>
                <p className="text-sm text-ink-soft">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : members.length === 0 ? (
          <motion.div variants={riseChild}>
            <EmptyState
              icon={Users}
              tileClassName="from-member-violet-soft to-member-sky-soft text-member-violet-strong"
              glowClassName="bg-member-violet-strong/10"
              ringClassName="border-member-violet-strong/30"
              orbitChips={[
                { icon: UserPlus, toneClassName: 'text-brand-600' },
                { icon: Heart, toneClassName: 'text-member-rose-strong' },
                { icon: UserPlus, toneClassName: 'text-member-sky-strong' },
              ]}
              title="Your household starts with people."
              description="Add members and every grocery split takes care of itself."
              action={
                isOwner ? (
                  <Button iconLeft={UserPlus} onClick={() => openDialog('add')}>
                    Add your first member
                  </Button>
                ) : undefined
              }
            />
          </motion.div>
        ) : (
          <>
            {/* A calculation failure (e.g. a grocery referencing a member who's
                since been removed) only means the financial numbers below
                can't be trusted — it's not a reason to also block adding,
                removing, or searching members, none of which depend on it. */}
            {settlementResult.status === 'error' && (
              <motion.div variants={riseChild} className="mb-5">
                <FinancialDataError message={settlementResult.userMessage} />
              </motion.div>
            )}

            <motion.div
              variants={riseChild}
              className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <Input
                placeholder="Search members…"
                iconLeft={Search}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
                aria-label="Search members"
              />
              <div className="flex items-center gap-3">
                <Badge tone="neutral" icon={Users}>
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </Badge>
                <SegmentedControl
                  aria-label="Sort members"
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'name', label: 'Name' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'paid', label: 'Paid' },
                  ]}
                />
              </div>
            </motion.div>

            <motion.div variants={riseChild}>
              {visibleMembers.length === 0 ? (
                <div className="card-surface flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center shadow-soft">
                  <p className="text-sm font-medium text-ink">
                    No members match “{search.trim()}”
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {visibleMembers.map((member) => (
                      <motion.li
                        key={member.id}
                        layout
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                        transition={transitionBase}
                      >
                        <MemberCard
                          member={withRealFinancials(
                            member,
                            groceries,
                            settlementResult.status === 'ok' ? settlementResult.viewModel : null,
                          )}
                          onOpen={setProfileId}
                          highlight={member.id === lastAddedId}
                          financialsUnavailable={settlementResult.status === 'error'}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </motion.div>
          </>
        )}
      </PageTransition>

      {dialogOpen && (
        <AddMemberDialog
          open={dialogOpen}
          initialTab={dialogTab}
          onClose={closeDialog}
          onAdd={handleAdd}
        />
      )}

      <MemberProfileDrawer
        member={
          profileMember
            ? withRealFinancials(
                profileMember,
                groceries,
                settlementResult.status === 'ok' ? settlementResult.viewModel : null,
              )
            : null
        }
        groceries={groceries}
        onClose={() => setProfileId(null)}
        onChangeTone={handleChangeTone}
        onRemove={handleRemove}
        onReactivate={handleReactivate}
        isOwner={isOwner}
        financialsUnavailable={settlementResult.status === 'error'}
      />
    </>
  )
}
