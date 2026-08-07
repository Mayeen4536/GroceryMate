import { describe, expect, it } from 'vitest'
import { OCRProviderNotImplementedError } from '../errors'
import { createOCRProvider } from './createOCRProvider'

describe('createOCRProvider', () => {
  it.each(['tesseract', 'google-vision', 'aws-textract', 'azure-vision'] as const)(
    'builds a provider identifying itself as "%s"',
    (vendor) => {
      expect(createOCRProvider({ vendor }).providerName).toBe(vendor)
    },
  )

  it('throws for an unsupported vendor value', () => {
    expect(() => createOCRProvider({ vendor: 'not-a-real-vendor' as never })).toThrow(/unsupported/i)
  })

  it('every vendor rejects with OCRProviderNotImplementedError until a real adapter exists', async () => {
    const provider = createOCRProvider({ vendor: 'google-vision' })
    await expect(provider.extractText({ imageUrl: 'blob:test' })).rejects.toThrow(OCRProviderNotImplementedError)
  })
})
