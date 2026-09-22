import type { Member, MemberStatus } from '@/types/member'

/** Raw shape returned by `select id, household_id, profile_id, display_name, invited_email, role, status, created_at, archived_at from household_members`. */
export interface HouseholdMemberRow {
  id: string
  household_id: string
  profile_id: string | null
  display_name: string
  invited_email: string | null
  role: string
  status: string
  created_at: string
  archived_at: string | null
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatLifecycleLabel(isoDate: string, status: MemberStatus): string {
  const date = new Date(isoDate)
  const monthYear = `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
  if (status === 'invited') return `Invited ${monthYear}`
  if (status === 'archived') return `Archived ${monthYear}`
  return `Joined ${monthYear}`
}

/** Deterministic, id-based (not name-based, so renaming a member never reshuffles their color) — same simple hash Avatar.tsx uses internally, duplicated rather than imported since that one isn't exported. */
function hashOf(value: string): number {
  let hash = 0
  for (const char of value) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return hash
}

const TONE_COUNT = 6

/**
 * Maps one real household_members row to the app's existing display-only
 * Member shape — real id/name/role/status/lifecycle timing in, decorative
 * placeholder fields (amountPaid/itemsAdded) that MembersPage's own
 * withRealFinancials immediately overwrites for any member actually
 * involved in a settlement calculation.
 */
export function mapHouseholdMemberRow(row: HouseholdMemberRow): Member {
  const status: MemberStatus =
    row.status === 'invited' ? 'invited' : row.status === 'archived' ? 'archived' : 'settled'
  return {
    id: row.id,
    name: row.display_name,
    // Only an invited row's own invited_email column is ever available here —
    // an active/joined member's real email lives on `profiles`, which RLS
    // does not let this client read for anyone but themselves (see
    // docs/MEMBER_INTEGRATION.md). Never fetched, never fabricated.
    email: row.status === 'invited' ? row.invited_email : null,
    tone: hashOf(row.id) % TONE_COUNT,
    role: row.role === 'owner' ? 'owner' : 'member',
    status,
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: formatLifecycleLabel(row.created_at, status),
    order: new Date(row.created_at).getTime(),
    archivedAt: row.archived_at ?? undefined,
  }
}
