import { describe, expect, it, vi } from 'vitest'
import { AIProviderError } from '../errors'
import { createOpenAIProvider } from './OpenAIProvider'

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('createOpenAIProvider', () => {
  it('sends the system prompt and user message in the Chat Completions shape', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ choices: [{ message: { content: '{"items": []}' } }] }))
    const provider = createOpenAIProvider({ apiKey: 'test-key', model: 'gpt-test', fetchImpl })

    await provider.complete({ systemPrompt: 'Extract groceries.', userMessage: 'Mayeen bought rice.' })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.headers.authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('gpt-test')
    expect(body.messages).toEqual([
      { role: 'system', content: 'Extract groceries.' },
      { role: 'user', content: 'Mayeen bought rice.' },
    ])
  })

  it('extracts the first choice\'s message content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ choices: [{ message: { content: 'hello' } }] }))
    const provider = createOpenAIProvider({ apiKey: 'k', model: 'm', fetchImpl })
    expect(await provider.complete({ systemPrompt: '', userMessage: '' })).toBe('hello')
  })

  it('uses a custom baseUrl when given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ choices: [{ message: { content: '{}' } }] }))
    const provider = createOpenAIProvider({ apiKey: 'k', model: 'm', baseUrl: 'https://proxy.example.com', fetchImpl })
    await provider.complete({ systemPrompt: '', userMessage: '' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://proxy.example.com')
  })

  it('throws AIProviderError on a non-2xx HTTP response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }))
    const provider = createOpenAIProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the network request itself fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    const provider = createOpenAIProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('throws AIProviderError when the response has no message content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ choices: [] }))
    const provider = createOpenAIProvider({ apiKey: 'k', model: 'm', fetchImpl })
    await expect(provider.complete({ systemPrompt: '', userMessage: '' })).rejects.toThrow(AIProviderError)
  })

  it('identifies itself as "openai"', () => {
    expect(createOpenAIProvider({ apiKey: 'k', model: 'm' }).providerName).toBe('openai')
  })
})
