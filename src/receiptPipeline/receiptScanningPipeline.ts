import type { GroceryParser, SkippedLine } from '@/ai'
import type { AIParsedItem, Currency, Receipt, ReceiptId } from '@/domain'
import type { OCRProvider } from '@/ocr'
import type { ReceiptTextCleanupService } from './receiptTextCleanupService'

export interface ReceiptScanningPipelineInput {
  readonly receipt: Receipt
  /** Given as context so the AI can recognize who's being referred to; never used to resolve ids here. */
  readonly knownMemberNames: readonly string[]
  /** The household's settlement currency, used only to convert a stated major-unit price into `Money`. */
  readonly currency: Currency
}

export interface ReceiptScanningPipelineResult {
  readonly receiptId: ReceiptId
  /** The OCR engine's raw output, or null when the receipt was pasted text and OCR was skipped entirely. */
  readonly rawOcrText: string | null
  readonly cleanedText: string
  readonly parsedItems: readonly AIParsedItem[]
  /** Lines the parser couldn't use — not fatal to the batch. */
  readonly skipped: readonly SkippedLine[]
}

/**
 * The automated middle of the receipt-scanning pipeline: OCR → AI Cleanup
 * → Parsed Groceries. Deliberately excludes Upload (produces the `Receipt`
 * this stage consumes) and User Confirmation (consumes what this stage
 * produces) — both involve a human and can't run inside an orchestrator
 * that's expected to return a result, so they're separate, independently
 * callable services (`receiptUploadService.ts`, `receiptConfirmationService.ts`).
 */
export interface ReceiptScanningPipeline {
  run(input: ReceiptScanningPipelineInput): Promise<ReceiptScanningPipelineResult>
}

export interface ReceiptScanningPipelineDeps {
  /** Only consulted for photo receipts — see the `source` branch below. */
  readonly ocrProvider: OCRProvider
  readonly textCleaner: ReceiptTextCleanupService
  readonly groceryParser: GroceryParser
}

/**
 * Wires the three automated stages together. Every dependency is an
 * interface, so any stage can be swapped (a different OCR vendor, a real
 * AI-backed cleaner instead of the passthrough default, a different
 * grocery parser) without this orchestrator changing at all.
 */
export function createReceiptScanningPipeline(deps: ReceiptScanningPipelineDeps): ReceiptScanningPipeline {
  return {
    async run(input: ReceiptScanningPipelineInput): Promise<ReceiptScanningPipelineResult> {
      const { receipt } = input

      const rawText: string =
        receipt.source === 'photo'
          ? (await deps.ocrProvider.extractText({ imageUrl: receipt.imageUrl })).rawText
          : receipt.text
      const rawOcrText = receipt.source === 'photo' ? rawText : null

      const { cleanedText } = await deps.textCleaner.clean(rawText)

      const { items, skipped } = await deps.groceryParser.parse({
        householdId: receipt.householdId,
        text: cleanedText,
        knownMemberNames: input.knownMemberNames,
        currency: input.currency,
      })

      return {
        receiptId: receipt.id,
        rawOcrText,
        cleanedText,
        parsedItems: items,
        skipped,
      }
    },
  }
}
