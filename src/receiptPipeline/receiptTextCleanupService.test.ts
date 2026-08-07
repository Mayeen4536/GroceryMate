import { describe, expect, it } from 'vitest'
import { createPassthroughTextCleaner } from './receiptTextCleanupService'

describe('createPassthroughTextCleaner', () => {
  it('returns the raw text unchanged', async () => {
    const cleaner = createPassthroughTextCleaner()
    const result = await cleaner.clean('R1ce .... 8O0\nChick3n --- 500')
    expect(result).toEqual({ cleanedText: 'R1ce .... 8O0\nChick3n --- 500' })
  })

  it('handles empty input without throwing', async () => {
    const cleaner = createPassthroughTextCleaner()
    expect(await cleaner.clean('')).toEqual({ cleanedText: '' })
  })
})
