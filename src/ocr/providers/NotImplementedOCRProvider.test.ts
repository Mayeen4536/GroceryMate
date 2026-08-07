import { describe, expect, it } from 'vitest'
import { OCRProviderNotImplementedError } from '../errors'
import { createNotImplementedOCRProvider } from './NotImplementedOCRProvider'

describe('createNotImplementedOCRProvider', () => {
  it('identifies itself by whatever provider name it was given', () => {
    expect(createNotImplementedOCRProvider('tesseract').providerName).toBe('tesseract')
  })

  it('rejects extractText with a clear, catchable error rather than failing silently', async () => {
    const provider = createNotImplementedOCRProvider('tesseract')
    const error = await provider.extractText({ imageUrl: 'blob:test' }).catch((e) => e)
    expect(error).toBeInstanceOf(OCRProviderNotImplementedError)
    expect(error.message).toContain('tesseract')
  })
})
