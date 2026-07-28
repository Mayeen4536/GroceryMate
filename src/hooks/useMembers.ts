import { useState } from 'react'
import { initialMembers } from '@/store/members'
import type { Member } from '@/types/member'

export type SortBy = 'name' | 'newest' | 'paid'
export type AddMemberTab = 'add' | 'invite'

/** The shape the add-member form submits. */
export interface NewMemberDraft {
  name: string
  email: string
  tone: number
}

const sorters: Record<SortBy, (a: Member, b: Member) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  newest: (a, b) => b.order - a.order,
  paid: (a, b) => (Number.parseFloat(b.amountPaid) || 0) - (Number.parseFloat(a.amountPaid) || 0),
}

/** Owns the Members feature's state: the roster, search/sort, dialog, and profile drawer. */
export function useMembers() {
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

  return {
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
    closeDialog: () => setDialogOpen(false),
    setProfileId,
    handleAdd,
    handleInvite,
    handleChangeTone,
    handleRemove,
  }
}
