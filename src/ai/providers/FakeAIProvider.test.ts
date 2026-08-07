import { describe, expect, it } from 'vitest'
import { createFakeAIProvider } from './FakeAIProvider'

describe('createFakeAIProvider', () => {
  it('returns the given response regardless of the request, for a single string', async () => {
    const provider = createFakeAIProvider('{"items": []}')
    const result = await provider.complete({ systemPrompt: 'anything', userMessage: 'anything else' })
    expect(result).toBe('{"items": []}')
  })

  it('records every request it receives', async () => {
    const provider = createFakeAIProvider('{"items": []}')
    await provider.complete({ systemPrompt: 'sys', userMessage: 'msg' })
    expect(provider.requests).toEqual([{ systemPrompt: 'sys', userMessage: 'msg' }])
  })

  it('returns queued responses in order when given an array', async () => {
    const provider = createFakeAIProvider(['first', 'second'])
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('first')
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('second')
  })

  it('keeps returning the last response forever if only one was queued', async () => {
    const provider = createFakeAIProvider('only')
    await provider.complete({ systemPrompt: '', userMessage: '' })
    await provider.complete({ systemPrompt: '', userMessage: '' })
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('only')
  })

  it('throws once every queued response (for a multi-item queue) has been consumed', async () => {
    const provider = createFakeAIProvider(['first', 'second'])
    await provider.complete({ systemPrompt: '', userMessage: '' })
    await provider.complete({ systemPrompt: '', userMessage: '' })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow()
  })

  it('identifies itself as the "fake" provider', () => {
    expect(createFakeAIProvider('x').providerName).toBe('fake')
  })
})
