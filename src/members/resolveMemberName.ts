import type { Member } from '@/types/member'

/**
 * Resolves a stable `household_members.id` to its current display name —
 * for *display* only, never as an identity key. Built from the full
 * roster (active, invited, and archived alike, whatever the caller
 * passed in), so a historical reference to an archived member still
 * resolves correctly; an id that genuinely isn't found (a truly orphaned
 * reference) falls back to `"Unknown member"` rather than crashing or
 * guessing. Shared by every feature that needs to turn a persisted id
 * back into a name (Groceries, History, Analytics, Settings export) so
 * the same fallback/archived-inclusion behavior can't drift between them.
 */
export function buildMemberNameResolver(members: readonly Member[]): (id: string) => string {
  const byId = new Map(members.map((member) => [member.id, member.name] as const))
  return (id: string) => (id ? (byId.get(id) ?? 'Unknown member') : '')
}
