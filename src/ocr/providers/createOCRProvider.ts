import type { OCRProvider } from '../OCRProvider'
import { createNotImplementedOCRProvider } from './NotImplementedOCRProvider'

/**
 * Every OCR vendor the pipeline is designed to support. Adding a vendor
 * here — and a real adapter file beside `NotImplementedOCRProvider.ts`,
 * following the pattern of `ai/providers/ClaudeProvider.ts` et al. — is
 * the only change needed to make it selectable; nothing that depends on
 * `OCRProvider` has to change.
 */
export type OCRProviderVendor = 'tesseract' | 'google-vision' | 'aws-textract' | 'azure-vision'

export interface OCRProviderConfig {
  readonly vendor: OCRProviderVendor
  readonly apiKey?: string
  /** Lets a vendor's endpoint be routed through a backend proxy once one exists, instead of calling it directly from the browser. */
  readonly baseUrl?: string
}

/**
 * The single vendor-aware seam for OCR, mirroring `ai/providers/createAIProvider.ts`.
 * No real adapters exist yet — every vendor currently resolves to
 * `NotImplementedOCRProvider` — so this factory documents exactly where
 * multi-vendor support plugs in without committing to any one vendor's
 * SDK or request shape before that work is scoped.
 */
export function createOCRProvider(config: OCRProviderConfig): OCRProvider {
  switch (config.vendor) {
    case 'tesseract':
    case 'google-vision':
    case 'aws-textract':
    case 'azure-vision':
      return createNotImplementedOCRProvider(config.vendor)
    default: {
      const exhaustiveCheck: never = config.vendor
      throw new Error(`Unsupported OCR vendor: ${exhaustiveCheck}`)
    }
  }
}
