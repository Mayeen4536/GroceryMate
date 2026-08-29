import type { MemberId } from '@/domain/ids'
import type { Member as UIMember } from '@/types/member'
import { AmbiguousMemberNameError, UnresolvableMemberNameError } from './errors'

/** A name matching more than one current member — resolving it would require guessing. */
const AMBIGUOUS = Symbol('ambiguous-member-name')

/**
 * Builds a display-name → member-id lookup from the current members list.
 * Members are the household's only stable identity source (`GroceryItem`
 * still keys `paidBy`/`sharedBy` by display name, a UI-layer shortcut that
 * predates ids being wired through) — this index is what turns "Aisha
 * Khan" back into a specific member id.
 *
 * A name shared by two or more current members is deliberately not
 * resolved to either of them: `resolveMemberIdByName` throws instead of
 * guessing (see its own doc comment). Never merge the ambiguity away here.
 */
export function buildMemberNameIndex(members: readonly UIMember[]): ReadonlyMap<string, MemberId | typeof AMBIGUOUS> {
  const index = new Map<string, MemberId | typeof AMBIGUOUS>()
  for (const member of members) {
    index.set(member.name, index.has(member.name) ? AMBIGUOUS : (member.id as MemberId))
  }
  return index
}

/**
 * Resolves a display name to a member id using an index built by
 * `buildMemberNameIndex`. Throws rather than silently repairing the
 * reference in either failure case:
 *
 * - The name isn't any current member (`UnresolvableMemberNameError`) —
 *   could be a removed member, a typo, or stale data from before a rename.
 * - The name matches more than one current member (`AmbiguousMemberNameError`)
 *   — GroceryMate can't tell which one a name-only reference means.
 *
 * `context` is a short human-readable description of where this name came
 * from (e.g. `paid for "Milk (2L)"`), folded into the thrown error's
 * message for anyone debugging or displaying it.
 */
export function resolveMemberIdByName(
  index: ReadonlyMap<string, MemberId | typeof AMBIGUOUS>,
  name: string,
  context: string,
): MemberId {
  const resolved = index.get(name)
  if (resolved === undefined) throw new UnresolvableMemberNameError(name, context)
  if (resolved === AMBIGUOUS) throw new AmbiguousMemberNameError(name)
  return resolved
}
