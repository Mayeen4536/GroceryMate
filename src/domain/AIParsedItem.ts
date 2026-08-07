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

/** Every household member shares this item, e.g. "everyone shared it." */
export interface SharedByEveryone {
  readonly scope: 'everyone'
}

/** Only the named members share this item, exactly as mentioned in the text. */
export interface SharedBySpecificMembers {
  readonly scope: 'specific'
  readonly names: readonly string[]
}

/**
 * Who the AI understood to be sharing this item — as names, not member ids,
 * since extraction never has access to (or needs) the household's real
 * membership records, only the text it was given.
 */
export type SuggestedSharing = SharedByEveryone | SharedBySpecificMembers

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
 *
 * `parsedPayerName` and `parsedSharedBy` are names as written in the
 * source text (e.g. "Mayeen", "Rahim and Karim"), not `MemberId`s —
 * matching those names to real members is a separate, deterministic
 * resolution step for whatever confirms this candidate, not something the
 * extraction step itself does.
 */
export type AIParsedItem = {
  readonly id: AIParsedItemId
  readonly householdId: HouseholdId
  readonly parsedName: string
  readonly parsedCategory: GroceryCategory
  readonly parsedQuantity: number
  readonly parsedPayerName: string
  readonly parsedSharedBy: SuggestedSharing
  /** 0 (no confidence) to 1 (fully confident). */
  readonly confidence: number
  readonly reviewed: boolean
  readonly parsedUnitPrice?: Money
} & (ParsedFromReceipt | ParsedFromPrompt)
