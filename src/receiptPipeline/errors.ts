/** Base error for anything that goes wrong while a receipt moves through the scanning pipeline. */
export class ReceiptPipelineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReceiptPipelineError'
  }
}

/** OCR was requested for a receipt that has no image to read (a pasted-text receipt). */
export class NoImageToScanError extends ReceiptPipelineError {
  constructor() {
    super('This receipt has no image — it was submitted as pasted text, so there is nothing for OCR to read.')
    this.name = 'NoImageToScanError'
  }
}
