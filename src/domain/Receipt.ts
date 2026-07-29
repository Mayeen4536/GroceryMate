import type { AIParsedItemId, HouseholdId, MemberId, ReceiptId } from './ids'

/** A photographed receipt, referenced by wherever the image is stored. */
export interface PhotoReceiptContent {
  readonly source: 'photo'
  readonly imageUrl: string
}

/** A receipt whose text was pasted in directly. */
export interface PastedReceiptContent {
  readonly source: 'pasted_text'
  readonly text: string
}

/** Not yet handed to the AI parser. */
export interface PendingReceiptProcessing {
  readonly processingStatus: 'pending'
}

/** Successfully parsed into AIParsedItem candidates. */
export interface ProcessedReceiptProcessing {
  readonly processingStatus: 'processed'
  readonly processedAt: Date
  readonly parsedItemIds: readonly AIParsedItemId[]
}

/** Parsing was attempted and failed. */
export interface FailedReceiptProcessing {
  readonly processingStatus: 'failed'
  readonly failedAt: Date
  readonly reason: string
}

/**
 * A receipt a member has submitted for the AI to read. Responsibility:
 * what was submitted and the current state of its parsing — not the
 * parsing itself, which is business logic for later.
 *
 * Both `source` and `processingStatus` are discriminated unions rather
 * than optional fields: a photo receipt has an image URL and no pasted
 * text (and vice versa), and only a processed receipt has parsed item
 * ids while only a failed one has a reason.
 */
export type Receipt = {
  readonly id: ReceiptId
  readonly householdId: HouseholdId
  readonly uploadedByMemberId: MemberId
  readonly uploadedAt: Date
} & (PhotoReceiptContent | PastedReceiptContent) &
  (PendingReceiptProcessing | ProcessedReceiptProcessing | FailedReceiptProcessing)
