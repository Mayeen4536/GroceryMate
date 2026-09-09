/**
 * Household queries/RPC go through PostgREST (a `{code, message, details,
 * hint}` shape), not GoTrue — a different error shape than src/auth/errors.ts,
 * so this is a separate, small normalizer rather than a shared one.
 */
export function normalizeHouseholdError(error: unknown): string {
  // Developer diagnostics only — the raw error never reaches the UI.
  console.error('[household]', error)
  return 'Something went wrong loading your household. Please try again.'
}
