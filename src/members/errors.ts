/** PostgREST error shape (household_members queries/writes) — same pattern as src/household/errors.ts, kept separate since the two modules' failure modes differ. */
export function normalizeMemberError(error: unknown): string {
  // Developer diagnostics only — the raw error never reaches the UI.
  console.error('[members]', error)
  return 'Something went wrong. Please try again.'
}
