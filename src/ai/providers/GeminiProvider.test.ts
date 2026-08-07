import { describe, expect, it, vi } from 'vitest'
import { AIProviderError } from '../errors'
import { createGeminiProvider } from './GeminiProvider'

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('createGeminiProvider', () => {
  it('sends the system instruction and user content in the generateContent shape', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse({ candidates: [{ content: { parts: [{ text: '{"items": []}' }] } }] }))
    const provider = createGeminiProvider({ apiKey: 'test-key', model: 'gemini-test', fetchImpl })

    await provider.complete({ systemPrompt: 'Extract groceries.', userMessage: 'Mayeen bought rice.' })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('gemini-test:generateContent')
    expect(url).toContain('key=test-key')
    const body = JSON.parse(init.body)
    expect(body.systemInstruction.parts[0].text).toBe('Extract groceries.')
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Mayeen bought rice.' }] }])
  })

  it('extracts the first candidate\'s text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }))
    const provider = createGeminiProvider({ apiKey: 'k', model: 'm', fetchImpl })
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('hello')
  })

  it('uses a custom baseUrl when given', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(okResponse({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }))
    const provider = createGeminiProvider({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://proxy.example.com/models',
      fetchImpl,
    })
    await provider.complete({ systemPrompt: '', userMessage: '' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://proxy.example.com/models/m:generateContent?key=k')
  })

  it('throws AIProviderError on a non-2xx HTTP response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('blocked', { status: 403 }))
    const provider = createGeminiProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the network request itself fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const provider = createGeminiProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the response has no candidate text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ candidates: [] }))
    const provider = createGeminiProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('identifies itself as "gemini"', () => {
    expect(createGeminiProvider({ apiKey: 'k', model: 'm' }).providerName).toBe('gemini')
  })
})
