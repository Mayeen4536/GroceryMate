import type { OCRProvider, OCRRequest, OCRResult } from '../OCRProvider'
import { OCRProviderNotImplementedError } from '../errors'

/**
 * A placeholder `OCRProvider` for a vendor whose real adapter hasn't been
 * built yet. Exists so `createOCRProvider` can return a well-typed
 * `OCRProvider` for every vendor today — proving the swappable-factory
 * shape works — without pretending any vendor can actually read an image.
 * Calling `extractText` always rejects with `OCRProviderNotImplementedError`.
 */
export function createNotImplementedOCRProvider(providerName: string): OCRProvider {
  return {
    providerName,
    async extractText(_request: OCRRequest): Promise<OCRResult> {
      throw new OCRProviderNotImplementedError(providerName)
    },
  }
}
