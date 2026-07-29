import type { Money } from './Money'
import type { GroceryCategory } from './GroceryItem'
import type { AIParsedItemId, HouseholdId, ReceiptId } from './ids'

/** Parsed from a submitted Receipt. */
export interface ParsedFromReceipt {
  readonly origin: 'receipt'
  readonly receiptId: ReceiptId
}

/** Parsed from a freeform request — typed or spoken — with no receipt involved. */
export interface ParsedFromPrompt {
  readonly origin: 'prompt'
  readonly promptText: string
}

/**
 * One candidate grocery line the AI extracted, waiting for a member to
 * confirm or correct it before it becomes a real GroceryItem.
 * Responsibility: hold the AI's best guess and how confident it was —
 * not the parsing itself, and not yet a committed purchase.
 *
 * `origin` is a discriminated union rather than an optional `receiptId`:
 * a receipt-sourced item always has one, a prompt-sourced item never does.
 * `parsedUnitPrice` stays optional on its own — casual requests like
 * "we need milk" routinely omit a price, whereas a quantity can always be
 * assumed (defaulting to one) so it stays required.
 */
export type AIParsedItem = {
  readonly id: AIParsedItemId
  readonly householdId: HouseholdId
  readonly parsedName: string
  readonly parsedCategory: GroceryCategory
  readonly parsedQuantity: number
  /** 0 (no confidence) to 1 (fully confident). */
  readonly confidence: number
  readonly reviewed: boolean
  readonly parsedUnitPrice?: Money
} & (ParsedFromReceipt | ParsedFromPrompt)
