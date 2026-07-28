import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Search, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Input, SegmentedControl } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useMembers } from '@/hooks/useMembers'
import { MemberCard } from './MemberCard'
import { AddMemberDialog } from './AddMemberDialog'
import { MemberProfileDrawer } from './MemberProfileDrawer'

/** The Members experience. All state is visual mock state; no calculations. */
export function MembersPage({ direction = 1 }: { direction?: number }) {
  const {
    members,
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
    handleInvite,
    handleChangeTone,
    handleRemove,
  } = useMembers()

  return (
    <>
      <PageTransition direction={direction}>
        <motion.div variants={riseChild}>
          <PageHeader
            title="Members"
            description="The people sharing this household."
            action={
              <>
                <Button variant="secondary" size="sm" onClick={() => openDialog('invite')}>
                  Invite
                </Button>
                <Button size="sm" iconLeft={UserPlus} onClick={() => openDialog('add')}>
                  Add member
                </Button>
              </>
            }
          />
        </motion.div>

        {members.length === 0 ? (
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
                <Button iconLeft={UserPlus} onClick={() => openDialog('add')}>
                  Add your first member
                </Button>
              }
            />
          </motion.div>
        ) : (
          <>
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
                          member={member}
                          onOpen={setProfileId}
                          highlight={member.id === lastAddedId}
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
          onInvite={handleInvite}
        />
      )}

      <MemberProfileDrawer
        member={profileMember}
        onClose={() => setProfileId(null)}
        onChangeTone={handleChangeTone}
        onRemove={handleRemove}
      />
    </>
  )
}
