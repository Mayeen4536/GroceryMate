import { describe, expect, it } from 'vitest'
import type { MemberId } from '@/domain/ids'
import type { Member as UIMember } from '@/types/member'
import { AmbiguousMemberNameError, UnresolvableMemberNameError } from './errors'
import { buildMemberNameIndex, resolveMemberIdByName } from './memberIdentity'

function makeUIMember(id: string, name: string): UIMember {
  return {
    id,
    name,
    email: `${id}@example.com`,
    tone: 0,
    role: 'member',
    status: 'settled',
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
  }
}

describe('memberIdentity', () => {
  it('resolves a unique name to its member id', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed')]
    const index = buildMemberNameIndex(members)
    expect(resolveMemberIdByName(index, 'Aisha Khan', 'test')).toBe('m-1' as MemberId)
    expect(resolveMemberIdByName(index, 'Bilal Ahmed', 'test')).toBe('m-2' as MemberId)
  })

  it('throws UnresolvableMemberNameError for a name that matches no current member', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan')]
    const index = buildMemberNameIndex(members)
    expect(() => resolveMemberIdByName(index, 'Ghost Person', 'paid for "Milk"')).toThrow(
      UnresolvableMemberNameError,
    )
  })

  it('does not confuse two members who happen to share the same display name', () => {
    // Two different real people, same name, different ids — a realistic scenario
    // (e.g. two "A"s, or a common name in the household).
    const members = [makeUIMember('m-1', 'Sam'), makeUIMember('m-2', 'Sam')]
    const index = buildMemberNameIndex(members)
    expect(() => resolveMemberIdByName(index, 'Sam', 'paid for "Milk"')).toThrow(AmbiguousMemberNameError)
  })

  it('still resolves an unambiguous name correctly even when a different name is duplicated elsewhere', () => {
    const members = [makeUIMember('m-1', 'Sam'), makeUIMember('m-2', 'Sam'), makeUIMember('m-3', 'Aisha Khan')]
    const index = buildMemberNameIndex(members)
    expect(resolveMemberIdByName(index, 'Aisha Khan', 'test')).toBe('m-3' as MemberId)
    expect(() => resolveMemberIdByName(index, 'Sam', 'test')).toThrow(AmbiguousMemberNameError)
  })

  it('treats a name shared by three or more members as ambiguous, not just the first duplicate', () => {
    const members = [makeUIMember('m-1', 'Sam'), makeUIMember('m-2', 'Sam'), makeUIMember('m-3', 'Sam')]
    const index = buildMemberNameIndex(members)
    expect(() => resolveMemberIdByName(index, 'Sam', 'test')).toThrow(AmbiguousMemberNameError)
  })

  it('builds an empty index for an empty household with no members', () => {
    const index = buildMemberNameIndex([])
    expect(() => resolveMemberIdByName(index, 'Anyone', 'test')).toThrow(UnresolvableMemberNameError)
  })

  it('includes the offending name in both error types for debuggability', () => {
    const members = [makeUIMember('m-1', 'Sam'), makeUIMember('m-2', 'Sam')]
    const index = buildMemberNameIndex(members)
    try {
      resolveMemberIdByName(index, 'Sam', 'test')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AmbiguousMemberNameError)
      expect((error as AmbiguousMemberNameError).memberName).toBe('Sam')
    }

    const emptyIndex = buildMemberNameIndex([])
    try {
      resolveMemberIdByName(emptyIndex, 'Ghost', 'test')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(UnresolvableMemberNameError)
      expect((error as UnresolvableMemberNameError).memberName).toBe('Ghost')
    }
  })
})
