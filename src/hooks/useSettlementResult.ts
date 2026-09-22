import { useMemo } from 'react'
import { CURRENCIES } from '@/domain/Currency'
import type { HouseholdId } from '@/domain/ids'
import { computeSettlement } from '@/engine'
import { describeSettlementError, toEngineInput, toSettlementViewModel } from '@/adapters'
import type { SettlementViewModel } from '@/adapters'
import { useHousehold } from '@/household/useHousehold'
import type { GroceryItem } from '@/types/grocery'
import type { Member } from '@/types/member'

/**
 * BDT-only for this integration, per product decision — the domain model
 * (`Currency`) already supports others; nothing here removes that support,
 * this hook just doesn't expose a picker for it yet (there isn't one in
 * the UI to wire up).
 */
const HOUSEHOLD_CURRENCY = CURRENCIES.BDT

export type SettlementResultState =
  | { readonly status: 'ok'; readonly viewModel: SettlementViewModel }
  | { readonly status: 'error'; readonly userMessage: string }

/**
 * The one place real member/grocery state becomes a real settlement — the
 * single financial source of truth every page (Settlements, Members) reads
 * from, rather than each computing its own. Recomputes only when the
 * members or groceries actually change.
 *
 * This is also the error boundary Step 8 asks for: `toEngineInput` and
 * `computeSettlement` both throw typed errors on invalid data (an unknown
 * member reference, a name two members share, an unparseable price) rather
 * than ever silently repairing it. Catching them here — instead of at a
 * React error boundary — keeps the failure a plain, testable value
 * (`{status: 'error', userMessage}`) instead of an unmounted page, and
 * keeps every other page's rendering unaffected by one page's bad data.
 * The full technical error still reaches the console for whoever's
 * developing against this; only `describeSettlementError`'s plain-language
 * summary ever reaches the screen.
 */
export function useSettlementResult(
  members: readonly Member[],
  groceries: readonly GroceryItem[],
): SettlementResultState {
  // Rendered only inside <HouseholdGate>, which never renders its children
  // until `household` is loaded — see src/household/HouseholdGate.tsx.
  const { household } = useHousehold()
  const householdId = (household?.id ?? '') as HouseholdId

  return useMemo(() => {
    try {
      const engineInput = toEngineInput(members, groceries, HOUSEHOLD_CURRENCY, householdId)
      const result = computeSettlement(engineInput.members, engineInput.groceries, HOUSEHOLD_CURRENCY)
      return { status: 'ok', viewModel: toSettlementViewModel(result, members) }
    } catch (error) {
      console.error('[useSettlementResult] settlement calculation failed:', error)
      return { status: 'error', userMessage: describeSettlementError(error) }
    }
  }, [members, groceries, householdId])
}
