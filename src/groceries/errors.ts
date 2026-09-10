/** PostgREST error shape (grocery_items/grocery_item_consumers queries/writes) — same pattern as src/members/errors.ts. */
export function normalizeGroceryError(error: unknown): string {
  // Developer diagnostics only — the raw error never reaches the UI.
  console.error('[groceries]', error)
  return 'Something went wrong. Please try again.'
}
