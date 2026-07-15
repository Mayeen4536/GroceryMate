import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, UserPlus, Users } from 'lucide-react'
import { Badge, Button, Input, SegmentedControl } from '../../components/ui'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageTransition } from '../../components/layout/PageTransition'
import { riseChild, transitionBase } from '../../lib/motion'
import { initialMembers, type Member } from '../../data/members'
import { MemberCard } from './MemberCard'
import { AddMemberDialog, type AddMemberTab, type NewMemberDraft } from './AddMemberDialog'
import { MemberProfileDrawer } from './MemberProfileDrawer'
import { MembersEmptyState } from './EmptyState'

type SortBy = 'name' | 'newest' | 'paid'

const sorters: Record<SortBy, (a: Member, b: Member) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  newest: (a, b) => b.order - a.order,
  paid: (a, b) => (Number.parseFloat(b.amountPaid) || 0) - (Number.parseFloat(a.amountPaid) || 0),
}

/** The Members experience. All state is visual mock state; no calculations. */
export function MembersPage({ direction = 1 }: { direction?: number }) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<AddMemberTab>('add')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const profileMember = members.find((member) => member.id === profileId) ?? null

  const query = search.trim().toLowerCase()
  const visibleMembers = members
    .filter(
      (member) =>
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query),
    )
    .sort(sorters[sortBy])

  const openDialog = (tab: AddMemberTab) => {
    setDialogTab(tab)
    setDialogOpen(true)
  }

  const nextOrder = () => members.reduce((max, member) => Math.max(max, member.order), 0) + 1

  const handleAdd = (draft: NewMemberDraft) => {
    const id = `m-${Date.now()}`
    setMembers((current) => [
      ...current,
      {
        id,
        name: draft.name,
        email: draft.email || `${draft.name.split(' ')[0].toLowerCase()}@flat4b.home`,
        tone: draft.tone,
        role: 'member',
        status: 'settled',
        amountPaid: '0',
        itemsAdded: 0,
        joinedLabel: 'Joined just now',
        order: nextOrder(),
      },
    ])
    setLastAddedId(id)
    setDialogOpen(false)
  }

  const handleInvite = (email: string) => {
    const id = `m-${Date.now()}`
    const namePart = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'New member'
    const name = namePart
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    setMembers((current) => [
      ...current,
      {
        id,
        name,
        email,
        tone: (current.length + 2) % 6,
        role: 'member',
        status: 'invited',
        amountPaid: '0',
        itemsAdded: 0,
        joinedLabel: 'Invited just now',
        order: nextOrder(),
      },
    ])
    setLastAddedId(id)
  }

  const handleChangeTone = (id: string, tone: number) => {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, tone } : member)),
    )
  }

  const handleRemove = (id: string) => {
    setProfileId(null)
    setMembers((current) => current.filter((member) => member.id !== id))
  }

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
            <MembersEmptyState onAdd={() => openDialog('add')} />
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
          onClose={() => setDialogOpen(false)}
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
