import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Member } from '@/types/member'

const ALICE: Member = {
  id: 'member-1',
  name: 'Alice',
  email: null,
  tone: 0,
  role: 'owner',
  status: 'settled',
  amountPaid: '0',
  itemsAdded: 0,
  joinedLabel: 'Joined Jan 2026',
  order: 1,
}

const BOB: Member = {
  id: 'member-2',
  name: 'Bob',
  email: null,
  tone: 1,
  role: 'member',
  status: 'settled',
  amountPaid: '0',
  itemsAdded: 0,
  joinedLabel: 'Joined Jan 2026',
  order: 2,
}

const mocks = vi.hoisted(() => ({
  members: [] as Member[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  addMember: vi.fn(),
  archiveMember: vi.fn(),
  reactivateMember: vi.fn(),
}))

vi.mock('@/members/useHouseholdMembers', () => ({
  useHouseholdMembers: () => ({
    members: mocks.members,
    loading: mocks.loading,
    error: mocks.error,
    refresh: mocks.refresh,
    addMember: mocks.addMember,
    archiveMember: mocks.archiveMember,
    reactivateMember: mocks.reactivateMember,
  }),
}))

const { useMembers } = await import('./useMembers')

beforeEach(() => {
  mocks.members = [ALICE, BOB]
  mocks.loading = false
  mocks.error = null
  mocks.refresh.mockReset()
  mocks.addMember.mockReset().mockResolvedValue({ id: 'member-3' })
  mocks.archiveMember.mockReset().mockResolvedValue({})
  mocks.reactivateMember.mockReset().mockResolvedValue({})
})

describe('useMembers', () => {
  it('passes through the real roster, loading, and error state untouched', () => {
    mocks.loading = true
    mocks.error = 'boom'
    const { result } = renderHook(() => useMembers())
    expect(result.current.members).toHaveLength(2)
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe('boom')
  })

  it('handleAdd delegates to addMember, sets lastAddedId, and closes the dialog on success', async () => {
    const { result } = renderHook(() => useMembers())
    act(() => result.current.openDialog('add'))
    expect(result.current.dialogOpen).toBe(true)

    await act(async () => {
      await result.current.handleAdd({ name: 'Chloe', email: '', tone: 2 })
    })

    expect(mocks.addMember).toHaveBeenCalledWith('Chloe')
    expect(result.current.lastAddedId).toBe('member-3')
    expect(result.current.dialogOpen).toBe(false)
  })

  it('handleAdd surfaces an error and keeps the dialog open', async () => {
    mocks.addMember.mockResolvedValue({ error: 'Something went wrong.' })
    const { result } = renderHook(() => useMembers())
    act(() => result.current.openDialog('add'))

    let addResult
    await act(async () => {
      addResult = await result.current.handleAdd({ name: 'Chloe', email: '', tone: 2 })
    })

    expect(addResult).toEqual({ error: 'Something went wrong.' })
    expect(result.current.dialogOpen).toBe(true)
    expect(result.current.lastAddedId).toBeNull()
  })

  it('handleRemove archives (never hard-deletes) and clears the open profile on success', async () => {
    const { result } = renderHook(() => useMembers())
    act(() => result.current.setProfileId('member-2'))

    await act(async () => {
      await result.current.handleRemove('member-2')
    })

    expect(mocks.archiveMember).toHaveBeenCalledWith('member-2')
    expect(result.current.profileMember).toBeNull()
  })

  it('handleRemove keeps the profile open when archiving fails', async () => {
    mocks.archiveMember.mockResolvedValue({ error: 'nope' })
    const { result } = renderHook(() => useMembers())
    act(() => result.current.setProfileId('member-2'))

    await act(async () => {
      await result.current.handleRemove('member-2')
    })

    expect(result.current.profileMember?.id).toBe('member-2')
  })

  it('handleReactivate delegates to reactivateMember', async () => {
    const { result } = renderHook(() => useMembers())

    await act(async () => {
      await result.current.handleReactivate('member-2')
    })

    expect(mocks.reactivateMember).toHaveBeenCalledWith('member-2')
  })

  it('handleChangeTone is a local-only override, applied without calling any write action', () => {
    const { result } = renderHook(() => useMembers())

    act(() => result.current.handleChangeTone('member-1', 4))

    const alice = result.current.members.find((member) => member.id === 'member-1')
    expect(alice?.tone).toBe(4)
    expect(mocks.addMember).not.toHaveBeenCalled()
    expect(mocks.archiveMember).not.toHaveBeenCalled()
  })

  it('search filters by name case-insensitively', () => {
    const { result } = renderHook(() => useMembers())
    act(() => result.current.setSearch('bob'))
    expect(result.current.visibleMembers.map((member) => member.name)).toEqual(['Bob'])
  })

  it('refresh is exposed and delegates to the real hook', async () => {
    const { result } = renderHook(() => useMembers())
    await act(async () => {
      await result.current.refresh()
    })
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
