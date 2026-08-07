/** What an OCR provider is asked to read. */
export interface OCRRequest {
  readonly imageUrl: string
  /** BCP-47 language hint (e.g. "en", "bn"), for providers that support it. Not every provider needs or accepts one. */
  readonly languageHint?: string
}

/** What an OCR provider hands back: text only, never structure or meaning. */
export interface OCRResult {
  readonly rawText: string
  /** 0 (no confidence) to 1 (fully confident), for providers that report one. Not every engine does. */
  readonly confidence?: number
}

/**
 * A vendor-agnostic contract for "turn a receipt photo into text." Mirrors
 * `AIProvider`: the receipt-scanning pipeline depends on this interface
 * only, never on a specific OCR vendor, so Tesseract, Google Vision, AWS
 * Textract, or Azure Computer Vision can be swapped in later without
 * touching anything downstream.
 *
 * Responsibility ends at raw text. An OCR provider never interprets what
 * it read — no item names, no prices, no structure — that's the AI
 * Cleanup and grocery-parsing stages' job, kept deliberately separate so
 * this contract stays swappable independent of them.
 */
export interface OCRProvider {
  readonly providerName: string
  extractText(request: OCRRequest): Promise<OCRResult>
}
