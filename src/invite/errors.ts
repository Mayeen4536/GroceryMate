/**
 * Every accept/create/revoke failure below is a plain `RAISE EXCEPTION`
 * (SQLSTATE P0001, no distinct code per case) from
 * supabase/migrations/20260919080821_household_invites.sql — the only way
 * to tell cases apart from the client is the exact message text, so this
 * matches on the literal strings that migration raises. If that migration's
 * wording ever changes, update the matches here in the same change.
 */
export type InviteErrorCode =
  | 'not-authenticated'
  | 'not-found'
  | 'household-archived'
  | 'not-owner'
  | 'invalid'
  | 'revoked'
  | 'expired'
  | 'already-used'
  | 'already-member'
  | 'same-household-conflict'
  | 'network'
  | 'unknown'

export interface InviteError {
  code: InviteErrorCode
  /** Safe to show a user as-is — never a raw PostgreSQL/PostgREST message. */
  message: string
}

const MESSAGE_MATCHERS: Array<{ test: (raw: string) => boolean; code: InviteErrorCode; message: string }> = [
  {
    test: (raw) => raw.includes('Not authenticated'),
    code: 'not-authenticated',
    message: 'Please sign in to continue.',
  },
  {
    test: (raw) => raw.includes('household is archived'),
    code: 'household-archived',
    message: 'This household is archived.',
  },
  {
    test: (raw) => raw.includes('Only the household owner'),
    code: 'not-owner',
    message: 'Only the household owner can do that.',
  },
  {
    test: (raw) =>
      raw === 'Invalid invite.' || raw.includes('Household not found') || raw.includes('Invite not found'),
    code: 'not-found',
    message: "This invite link isn't valid.",
  },
  {
    test: (raw) => raw.includes('has been revoked') || raw.includes('already been used or revoked'),
    code: 'revoked',
    message: 'This invite link is no longer active.',
  },
  {
    test: (raw) => raw.includes('has expired'),
    code: 'expired',
    message: 'This invite link has expired.',
  },
  {
    test: (raw) => raw.includes('already been used'),
    code: 'already-used',
    message: 'This invite link has already been used.',
  },
  {
    test: (raw) => raw.includes('previously a member of this household'),
    code: 'same-household-conflict',
    message:
      'You were previously a member of this household. Ask the household owner to reactivate your membership.',
  },
  {
    test: (raw) => raw.includes('already belong to a household'),
    code: 'already-member',
    message: 'You already belong to a household.',
  },
]

/**
 * Household invite RPCs go through PostgREST, like src/household/errors.ts's
 * own normalizer — but unlike that one, invite failures carry real,
 * user-facing distinctions (expired vs. revoked vs. already a member) that
 * the UI must react to differently, so this returns a stable `code` alongside
 * a safe display `message` instead of collapsing everything to one string.
 */
export function normalizeInviteError(error: unknown): InviteError {
  console.error('[invite]', error)

  const raw =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  const matched = MESSAGE_MATCHERS.find((matcher) => matcher.test(raw))
  if (matched) return { code: matched.code, message: matched.message }

  // A real backend rejection always carries one of the exact messages
  // matched above; anything else with no message at all, or one shaped
  // like the browser's own fetch failure, means the request never reached
  // the server in the first place.
  if (!raw || /fetch|network/i.test(raw)) {
    return { code: 'network', message: "Couldn't reach the server. Check your connection and try again." }
  }
  return { code: 'unknown', message: 'Something went wrong. Please try again.' }
}
