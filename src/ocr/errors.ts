/** Base error for anything that goes wrong turning a receipt image into text. */
export class OCRError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OCRError'
  }
}

/** An OCR provider's own call failed — a rejected request, a non-2xx response, or similar. */
export class OCRProviderError extends OCRError {
  constructor(
    public readonly providerName: string,
    public readonly cause: unknown,
  ) {
    super(`OCR provider "${providerName}" failed: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'OCRProviderError'
  }
}

/** The provider ran without error but found no readable text at all — e.g. a blank, corrupted, or unreadable image. */
export class OCREmptyResultError extends OCRError {
  constructor(public readonly providerName: string) {
    super(`OCR provider "${providerName}" found no readable text in the image.`)
    this.name = 'OCREmptyResultError'
  }
}

/** A vendor was selected that has no real implementation yet — see providers/createOCRProvider.ts. */
export class OCRProviderNotImplementedError extends OCRError {
  constructor(public readonly providerName: string) {
    super(
      `OCR provider "${providerName}" is not implemented yet. Only the interface is designed so far — ` +
        'see src/ocr/providers/createOCRProvider.ts for where a real adapter would plug in.',
    )
    this.name = 'OCRProviderNotImplementedError'
  }
}
