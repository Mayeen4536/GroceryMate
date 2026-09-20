import { useState } from 'react'
import { useHouseholdMembers } from '@/members/useHouseholdMembers'
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

/**
 * Owns the Members feature's page-local UI state: search, sort, the
 * add/invite dialog, and the profile drawer. The roster itself and its
 * CRUD are real and Supabase-backed — see src/members/useHouseholdMembers.ts,
 * which this wraps rather than duplicates, keeping every existing caller
 * (App.tsx, MembersPage, GroceryForm via useMemberOptions) on the exact
 * same shape this hook already returned before the migration.
 */
export function useMembers() {
  const { members, loading, error, refresh, addMember, archiveMember, reactivateMember } = useHouseholdMembers()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<AddMemberTab>('add')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  // Tone (avatar color theme) has no column on household_members — it's a
  // purely local, session-scoped override on top of the id-derived default
  // (src/members/types.ts's mapHouseholdMemberRow), not persisted. Applied
  // once here so every derived list/lookup below already reflects it.
  const [toneOverrides, setToneOverrides] = useState<Record<string, number>>({})
  const displayMembers =
    Object.keys(toneOverrides).length === 0
      ? members
      : members.map((member) => (member.id in toneOverrides ? { ...member, tone: toneOverrides[member.id] } : member))

  const profileMember = displayMembers.find((member) => member.id === profileId) ?? null

  const query = search.trim().toLowerCase()
  const visibleMembers = displayMembers
    .filter(
      (member) =>
        !query || member.name.toLowerCase().includes(query) || (member.email?.toLowerCase().includes(query) ?? false),
    )
    .sort(sorters[sortBy])

  const openDialog = (tab: AddMemberTab) => {
    setDialogTab(tab)
    setDialogOpen(true)
  }

  const handleAdd = async (draft: NewMemberDraft) => {
    // draft.email/draft.tone are collected by the dialog but never
    // persisted: real non-account participants have no email column on
    // household_members (see docs/MEMBER_INTEGRATION.md), and tone is a
    // purely local display preference (see handleChangeTone below).
    const result = await addMember(draft.name)
    if (!result.error && result.id) {
      setLastAddedId(result.id)
      setDialogOpen(false)
    }
    return result
  }

  // Kept as a real, working action (rather than removed) since nothing in
  // this slice's scope asked for the color-theme UI feature to go away.
  const handleChangeTone = (id: string, tone: number) => {
    setToneOverrides((current) => ({ ...current, [id]: tone }))
  }

  const handleRemove = async (id: string) => {
    const result = await archiveMember(id)
    if (!result.error) setProfileId(null)
    return result
  }

  const handleReactivate = async (id: string) => {
    return reactivateMember(id)
  }

  return {
    members: displayMembers,
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
    closeDialog: () => setDialogOpen(false),
    setProfileId,
    handleAdd,
    handleChangeTone,
    handleRemove,
    handleReactivate,
  }
}
