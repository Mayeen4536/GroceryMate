import { useMemo } from 'react'
import { buildMemberNameIndex, resolveMemberIdByName } from '@/adapters'
import type { Member } from '@/types/member'

/** A member as a financial-participant option: stable id plus display name. */
export interface MemberOption {
  readonly id: string
  readonly name: string
}

export interface MemberOptions {
  /** Every member currently eligible to be selected as a payer or sharer. */
  readonly options: readonly MemberOption[]
  /**
   * Resolves a stored `GroceryItem.paidBy`/`sharedBy` name (the format
   * grocery data is persisted in — see `src/adapters`) back to a member id,
   * for pre-filling a picker when editing. Returns `null`, never a guess,
   * when the name doesn't match exactly one *current, selectable* member —
   * removed, renamed, or ambiguous (two members sharing that name) all
   * resolve to `null` alike, leaving the picker correctly showing nothing
   * pre-selected rather than a stale or wrong person.
   */
  readonly resolveIdForName: (name: string) => string | null
  /** The display name for a selected option's id — what actually gets stored on the `GroceryItem`. */
  readonly nameForId: (id: string | null) => string
}

/**
 * The pure computation behind `useMemberOptions` (below), kept separate so
 * it can be unit tested directly without needing a React render — building
 * `MemberOptions` involves no hooks of its own, only `useMemberOptions`'s
 * `useMemo` wrapper does.
 *
 * Deliberately excludes invited-but-not-yet-joined members (someone who
 * hasn't joined the household yet can't have actually paid for or shared
 * in a grocery run) and archived members (removed from the household,
 * per docs/MEMBER_INTEGRATION.md — excluded from *new*-selection only;
 * still present in the full `members` array passed to the settlement
 * engine, so a grocery that already references an archived member stays
 * resolvable).
 */
export function buildMemberOptions(members: readonly Member[]): MemberOptions {
  const selectable = members.filter((member) => member.status !== 'invited' && member.status !== 'archived')
  const nameIndex = buildMemberNameIndex(selectable)
  const nameById = new Map(selectable.map((member) => [member.id, member.name]))

  return {
    options: selectable.map((member) => ({ id: member.id, name: member.name })),
    resolveIdForName: (name: string) => {
      try {
        return resolveMemberIdByName(nameIndex, name, 'grocery form pre-fill')
      } catch {
        return null
      }
    },
    nameForId: (id: string | null) => (id ? nameById.get(id) ?? '' : ''),
  }
}

/**
 * The one place the app turns "the current household roster" into
 * something a payer/shared-by picker can offer. Both `GroceryForm` and the
 * Assistant's `GeneratedGroceries` review call this with the same live
 * `members` list (lifted to `App.tsx`), so neither ever falls back to the
 * static `mockMembers` list, and a member added, renamed, or removed via
 * the Members page is reflected here on the very next render — no extra
 * plumbing beyond the prop already flowing down.
 */
export function useMemberOptions(members: readonly Member[]): MemberOptions {
  return useMemo(() => buildMemberOptions(members), [members])
}
