import { useCallback, useEffect, useRef, useState } from 'react'
import { parseMoneyInput } from '@/adapters'
import { supabase } from '@/auth/supabaseClient'
import { useHousehold } from '@/household/useHousehold'
import type { CategoryId, GroceryItem } from '@/types/grocery'
import { normalizeGroceryError } from './errors'
import { groupConsumersByGroceryItem, mapGroceryItemRow, type GroceryConsumerRow, type GroceryItemRow } from './types'

const ITEM_SELECT_COLUMNS =
  'id, household_id, name, category, amount_minor, quantity, paid_by_member_id, created_by_member_id, notes, created_at, updated_at'
const CONSUMER_SELECT_COLUMNS = 'grocery_item_id, household_member_id'

/** The shape a grocery form submits — every persisted field except id/created_by (the hook derives created_by itself). */
export interface GroceryDraft {
  name: string
  price: string
  quantity: number
  category: CategoryId
  paidByMemberId: string
  sharedByMemberIds: string[]
  notes: string
}

export interface GroceryWriteResult {
  error?: string
}

export interface AddGroceryResult extends GroceryWriteResult {
  /** The new row's real id — used only for the one-shot "just added" highlight, never as a guess. */
  id?: string
}

interface GroceriesState {
  groceries: GroceryItem[]
  loading: boolean
  error: string | null
}

const IDLE_STATE: GroceriesState = { groceries: [], loading: true, error: null }

/**
 * Validates the fields every grocery write needs regardless of add vs.
 * edit, so neither path can silently send Postgres a request it would
 * reject anyway (or worse, one that RLS would happily accept but that
 * doesn't mean what the user intended). Never fabricates a value for a
 * missing field — every failure here surfaces as a plain, specific message.
 */
function validateDraft(draft: GroceryDraft): { error?: string; minorUnits?: number } {
  if (!draft.name.trim()) return { error: 'Give this item a name.' }
  const parsedPrice = parseMoneyInput(draft.price)
  if (!parsedPrice.ok) return { error: 'Enter a valid price.' }
  if (!draft.paidByMemberId) return { error: 'Choose who paid for this item.' }
  if (draft.sharedByMemberIds.length === 0) return { error: 'Pick at least one person sharing this item.' }
  return { minorUnits: parsedPrice.minorUnits }
}

async function loadGroceries(householdId: string): Promise<GroceriesState> {
  const { data: itemRows, error: itemsError } = await supabase
    .from('grocery_items')
    .select(ITEM_SELECT_COLUMNS)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .returns<GroceryItemRow[]>()

  if (itemsError) {
    return { groceries: [], loading: false, error: normalizeGroceryError(itemsError) }
  }
  if (!itemRows || itemRows.length === 0) {
    return { groceries: [], loading: false, error: null }
  }

  const { data: consumerRows, error: consumersError } = await supabase
    .from('grocery_item_consumers')
    .select(CONSUMER_SELECT_COLUMNS)
    .eq('household_id', householdId)
    .returns<GroceryConsumerRow[]>()

  if (consumersError) {
    // A partial relation error: the items themselves loaded fine, but their
    // consumer relationships didn't. Rendering the items anyway with an
    // empty/guessed consumer list would silently understate every item's
    // real sharing — treated as a full load failure instead, never
    // fabricated. See docs/GROCERY_INTEGRATION.md.
    return { groceries: [], loading: false, error: normalizeGroceryError(consumersError) }
  }

  const consumersByItem = groupConsumersByGroceryItem(consumerRows ?? [])
  return {
    groceries: itemRows.map((row) => mapGroceryItemRow(row, consumersByItem.get(row.id) ?? [])),
    loading: false,
    error: null,
  }
}

/**
 * Owns the current household's real groceries (every grocery_items row,
 * not just ones the caller created — see docs/GROCERY_INTEGRATION.md). A
 * plain hook, not a Context — exactly the same reasoning as
 * `useHouseholdMembers`: only ever needed by pages `App.tsx` already
 * prop-threads (Groceries, Assistant, Settlements via `useSettlementResult`).
 */
export function useHouseholdGroceries() {
  const { household, currentMembership } = useHousehold()
  const [state, setState] = useState<GroceriesState>(IDLE_STATE)

  const householdId = household?.id
  const creatorMemberId = currentMembership?.id

  // Reset immediately on any household/identity change — during render, not
  // an effect (same pattern as HouseholdProvider/useHouseholdMembers) — so a
  // household switch or sign-out can never render the previous household's
  // groceries, even for one frame.
  const lastHouseholdIdRef = useRef(householdId)
  if (householdId !== lastHouseholdIdRef.current) {
    lastHouseholdIdRef.current = householdId
    setState(IDLE_STATE)
  }

  const refresh = useCallback(async () => {
    if (!householdId) return
    setState((s) => ({ ...s, loading: true }))
    const result = await loadGroceries(householdId)
    setState(result)
  }, [householdId])

  useEffect(() => {
    async function run() {
      await refresh()
    }
    run()
  }, [refresh])

  const addGrocery = useCallback(
    async (draft: GroceryDraft): Promise<AddGroceryResult> => {
      if (!householdId) return { error: 'No household loaded yet.' }
      if (!creatorMemberId) return { error: 'Your own membership hasn’t loaded yet.' }
      const validated = validateDraft(draft)
      if (validated.error || validated.minorUnits === undefined) return { error: validated.error }

      const { data: itemRow, error: itemError } = await supabase
        .from('grocery_items')
        .insert({
          household_id: householdId,
          name: draft.name.trim(),
          category: draft.category,
          amount_minor: validated.minorUnits,
          quantity: draft.quantity,
          paid_by_member_id: draft.paidByMemberId,
          created_by_member_id: creatorMemberId,
          notes: draft.notes.trim() || null,
        })
        .select('id')
        .single()
      if (itemError || !itemRow) return { error: normalizeGroceryError(itemError) }

      const { error: consumerError } = await supabase.from('grocery_item_consumers').insert(
        draft.sharedByMemberIds.map((memberId) => ({
          grocery_item_id: itemRow.id,
          household_member_id: memberId,
          household_id: householdId,
        })),
      )
      if (consumerError) {
        // No migration/RPC is available this slice, so there is no real
        // transaction wrapping these two inserts — this is a client-driven
        // compensating action, not atomicity. If this rollback call itself
        // fails (a second network error right after the first), a
        // consumer-less grocery_items row is left behind: a known,
        // documented residual risk of not having an RPC here — see
        // docs/GROCERY_INTEGRATION.md's "partial-write strategy".
        const { error: rollbackError } = await supabase.from('grocery_items').delete().eq('id', itemRow.id)
        if (rollbackError) {
          console.error('[groceries] rollback delete failed after a consumer-insert failure — an orphaned grocery_items row may remain:', rollbackError)
        }
        return { error: normalizeGroceryError(consumerError) }
      }

      await refresh()
      return { id: itemRow.id }
    },
    [householdId, creatorMemberId, refresh],
  )

  const editGrocery = useCallback(
    async (id: string, draft: GroceryDraft): Promise<GroceryWriteResult> => {
      if (!householdId) return { error: 'No household loaded yet.' }
      const validated = validateDraft(draft)
      if (validated.error || validated.minorUnits === undefined) return { error: validated.error }

      const { data: updatedRow, error: updateError } = await supabase
        .from('grocery_items')
        .update({
          name: draft.name.trim(),
          category: draft.category,
          amount_minor: validated.minorUnits,
          quantity: draft.quantity,
          paid_by_member_id: draft.paidByMemberId,
          notes: draft.notes.trim() || null,
        })
        .eq('id', id)
        .select('id')
        .maybeSingle()
      if (updateError) return { error: normalizeGroceryError(updateError) }
      // RLS silently excludes a row this caller isn't the creator/owner for
      // — the UPDATE affects zero rows rather than erroring (same shape as
      // household_members' own archive/reactivate — see
      // docs/MEMBER_INTEGRATION.md). maybeSingle() returns null data here,
      // not an error, so this is checked explicitly.
      if (!updatedRow) return { error: 'You don’t have permission to edit this item.' }

      // Replace the consumer set by its actual difference — never a blind
      // delete-all-then-insert-all, which would momentarily leave the item
      // with zero consumers if the insert half then failed. Unchanged
      // consumers are never touched at all.
      const { data: existingConsumerRows, error: existingError } = await supabase
        .from('grocery_item_consumers')
        .select('household_member_id')
        .eq('grocery_item_id', id)
        .returns<{ household_member_id: string }[]>()
      if (existingError) return { error: normalizeGroceryError(existingError) }

      const existingIds = new Set((existingConsumerRows ?? []).map((row) => row.household_member_id))
      const nextIds = new Set(draft.sharedByMemberIds)
      const toAdd = draft.sharedByMemberIds.filter((memberId) => !existingIds.has(memberId))
      const toRemove = [...existingIds].filter((memberId) => !nextIds.has(memberId))

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase.from('grocery_item_consumers').insert(
          toAdd.map((memberId) => ({ grocery_item_id: id, household_member_id: memberId, household_id: householdId })),
        )
        // The item's own fields are already saved at this point — a
        // consumer-diff failure is reported as an edit failure (never a
        // silent success), but it does not undo the item update itself,
        // matching "no RPC available" the same way `addGrocery` does.
        if (insertError) return { error: normalizeGroceryError(insertError) }
      }
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('grocery_item_consumers')
          .delete()
          .eq('grocery_item_id', id)
          .in('household_member_id', toRemove)
        if (deleteError) return { error: normalizeGroceryError(deleteError) }
      }

      await refresh()
      return {}
    },
    [householdId, refresh],
  )

  const deleteGrocery = useCallback(
    async (id: string): Promise<GroceryWriteResult> => {
      const { data, error } = await supabase.from('grocery_items').delete().eq('id', id).select('id').maybeSingle()
      if (error) return { error: normalizeGroceryError(error) }
      if (!data) return { error: 'You don’t have permission to delete this item.' }
      // grocery_item_consumers rows cascade-delete with it (Migration 2's
      // ON DELETE CASCADE) — no separate cleanup call needed here.
      await refresh()
      return {}
    },
    [refresh],
  )

  return {
    groceries: state.groceries,
    loading: state.loading,
    error: state.error,
    refresh,
    addGrocery,
    editGrocery,
    deleteGrocery,
  }
}
