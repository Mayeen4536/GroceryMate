import type {
  AIParsedItemId,
  GroceryCategory,
  GroceryItem,
  GroceryItemId,
  HouseholdId,
  MemberId,
  Money,
} from '@/domain'

/**
 * What a member confirmed after reviewing one `AIParsedItem` candidate —
 * the AI's guessed name/category/quantity/price, edited if the member
 * corrected anything, plus the one thing the AI could never produce
 * itself: real `MemberId`s for who paid and who shares it, resolved by
 * the member from the AI's guessed names (see `AIParsedItem.parsedPayerName`
 * / `parsedSharedBy` — matching those strings to real members is a UI
 * concern, not this service's).
 */
export interface ReceiptItemConfirmation {
  readonly parsedItemId: AIParsedItemId
  readonly name: string
  readonly category: GroceryCategory
  readonly quantity: number
  readonly unitPrice: Money
  readonly paidByMemberId: MemberId
  readonly sharedByMemberIds: readonly MemberId[]
  readonly notes?: string
}

export interface ConfirmedGroceryItem {
  readonly groceryItem: GroceryItem
  /** Carried through so the caller can mark the source `AIParsedItem` as reviewed. */
  readonly parsedItemId: AIParsedItemId
}

/**
 * The pipeline's last automated step before the settlement engine: turn
 * one human-confirmed candidate into a real `GroceryItem`. Deliberately
 * mechanical — no AI, no OCR, no arithmetic, just assembling already-decided
 * fields into a domain entity — so unlike OCR and AI Cleanup, there's no
 * reason to defer a real implementation.
 *
 * The resulting `GroceryItem`s are exactly what `engine/settlementEngine.ts`
 * takes as input; this service does not call the engine itself, since a
 * settlement recompute is a household-wide concern that happens whenever
 * the grocery list changes, not something one receipt's confirmation
 * should trigger unilaterally.
 */
export interface ReceiptConfirmationService {
  confirm(confirmation: ReceiptItemConfirmation, householdId: HouseholdId): ConfirmedGroceryItem
}

export interface ReceiptConfirmationServiceDeps {
  /** Defaults to `crypto.randomUUID`; override in tests for deterministic ids. */
  readonly generateId?: () => string
  /** Defaults to `() => new Date()`; override in tests for a deterministic timestamp. */
  readonly now?: () => Date
}

export function createReceiptConfirmationService(deps: ReceiptConfirmationServiceDeps = {}): ReceiptConfirmationService {
  const generateId = deps.generateId ?? (() => crypto.randomUUID())
  const now = deps.now ?? (() => new Date())

  return {
    confirm(confirmation: ReceiptItemConfirmation, householdId: HouseholdId): ConfirmedGroceryItem {
      const base = {
        id: generateId() as GroceryItemId,
        householdId,
        name: confirmation.name,
        category: confirmation.category,
        unitPrice: confirmation.unitPrice,
        quantity: confirmation.quantity,
        paidByMemberId: confirmation.paidByMemberId,
        sharedByMemberIds: confirmation.sharedByMemberIds,
        addedAt: now(),
      }

      const groceryItem: GroceryItem = confirmation.notes === undefined ? base : { ...base, notes: confirmation.notes }

      return { groceryItem, parsedItemId: confirmation.parsedItemId }
    },
  }
}
