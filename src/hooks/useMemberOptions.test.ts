import { describe, expect, it } from 'vitest'
import { buildMemberOptions } from './useMemberOptions'
import type { Member } from '@/types/member'

function makeMember(overrides: Partial<Member> & { id: string; name: string }): Member {
  return {
    email: `${overrides.id}@example.com`,
    tone: 0,
    role: 'member',
    status: 'settled',
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
    ...overrides,
  }
}

describe('buildMemberOptions', () => {
  it('offers every current member as a selectable option', () => {
    const members = [
      makeMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeMember({ id: 'm-2', name: 'Bilal Ahmed' }),
    ]
    const options = buildMemberOptions(members)
    expect(options.options).toEqual([
      { id: 'm-1', name: 'Aisha Khan' },
      { id: 'm-2', name: 'Bilal Ahmed' },
    ])
  })

  it('a newly-added member appears in the options the very next time this is called — no extra plumbing needed', () => {
    const before = buildMemberOptions([makeMember({ id: 'm-1', name: 'Aisha Khan' })])
    expect(before.options.map((o) => o.name)).toEqual(['Aisha Khan'])

    const after = buildMemberOptions([
      makeMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeMember({ id: 'm-2', name: 'Zara Islam' }),
    ])
    expect(after.options.map((o) => o.name)).toEqual(['Aisha Khan', 'Zara Islam'])
  })

  it('a removed member no longer appears in the options', () => {
    const before = buildMemberOptions([
      makeMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeMember({ id: 'm-2', name: 'Daniyal Raza' }),
    ])
    expect(before.options).toHaveLength(2)

    const after = buildMemberOptions([makeMember({ id: 'm-1', name: 'Aisha Khan' })])
    expect(after.options).toEqual([{ id: 'm-1', name: 'Aisha Khan' }])
    expect(after.options.some((o) => o.name === 'Daniyal Raza')).toBe(false)
  })

  it('excludes invited-but-not-yet-joined members from selection', () => {
    const members = [
      makeMember({ id: 'm-1', name: 'Aisha Khan', status: 'settled' }),
      makeMember({ id: 'm-2', name: 'Fatima Noor', status: 'invited' }),
    ]
    const options = buildMemberOptions(members)
    expect(options.options).toEqual([{ id: 'm-1', name: 'Aisha Khan' }])
  })

  it('handles a single-member household', () => {
    const options = buildMemberOptions([makeMember({ id: 'm-1', name: 'Aisha Khan' })])
    expect(options.options).toEqual([{ id: 'm-1', name: 'Aisha Khan' }])
    expect(options.resolveIdForName('Aisha Khan')).toBe('m-1')
  })

  it('handles a zero-member household without error', () => {
    const options = buildMemberOptions([])
    expect(options.options).toEqual([])
    expect(options.resolveIdForName('Anyone')).toBeNull()
    expect(options.nameForId('m-1')).toBe('')
  })

  it('resolves a stored name back to the correct id for pre-filling an edit', () => {
    const members = [
      makeMember({ id: 'm-1', name: 'Aisha Khan' }),
      makeMember({ id: 'm-2', name: 'Bilal Ahmed' }),
    ]
    const options = buildMemberOptions(members)
    expect(options.resolveIdForName('Bilal Ahmed')).toBe('m-2')
  })

  it("resolves a removed member's stale name to null rather than guessing", () => {
    const options = buildMemberOptions([makeMember({ id: 'm-1', name: 'Aisha Khan' })])
    expect(options.resolveIdForName('Daniyal Raza')).toBeNull()
  })

  it('two members sharing the same display name resolve to independent ids, never confused with each other', () => {
    const members = [
      makeMember({ id: 'm-1', name: 'Sam Test' }),
      makeMember({ id: 'm-2', name: 'Sam Test' }),
      makeMember({ id: 'm-3', name: 'Aisha Khan' }),
    ]
    const options = buildMemberOptions(members)

    // Both are real, independently selectable options...
    expect(options.options).toEqual([
      { id: 'm-1', name: 'Sam Test' },
      { id: 'm-2', name: 'Sam Test' },
      { id: 'm-3', name: 'Aisha Khan' },
    ])
    // ...but the name alone can't tell them apart, so resolving by name refuses to guess.
    expect(options.resolveIdForName('Sam Test')).toBeNull()
    // An unambiguous name elsewhere in the same roster still resolves correctly.
    expect(options.resolveIdForName('Aisha Khan')).toBe('m-3')
  })

  it('round-trips an id back to its current display name', () => {
    const members = [makeMember({ id: 'm-1', name: 'Aisha Khan' })]
    const options = buildMemberOptions(members)
    expect(options.nameForId('m-1')).toBe('Aisha Khan')
    expect(options.nameForId(null)).toBe('')
    expect(options.nameForId('m-999')).toBe('')
  })
})
