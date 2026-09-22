import { describe, expect, it, vi } from 'vitest'
import { createFakeAIProvider } from '@/ai'
import { CURRENCIES } from '@/domain'
import type { MemberId } from '@/domain'
import type { AIProvider } from '@/ai'
import { createAIFairnessExplanationService } from './aiExplanationService'
import type { SettlementExplanationFacts } from './explanationFacts'
import type { FairnessExplanationService } from './templateExplanationService'

const RAHIM = 'member-rahim' as MemberId

const FACTS: SettlementExplanationFacts = {
  memberId: RAHIM,
  memberName: 'Rahim',
  currency: CURRENCIES.BDT,
  direction: 'owes',
  amountMinorUnits: 60000,
  spentMinorUnits: 20000,
  consumedMinorUnits: 80000,
  itemsPaidFor: ['snacks'],
  itemsSharedIn: ['rice', 'chicken', 'cooking oil', 'snacks'],
  transfers: [],
}

describe('createAIFairnessExplanationService — the happy path', () => {
  it('returns the AI\'s text, tagged as "ai", when it correctly states the calculated amount', async () => {
    const provider = createFakeAIProvider(
      'Rahim owes ৳600 because he shared rice, chicken, and cooking oil, but only paid for snacks.',
    )
    const service = createAIFairnessExplanationService({ provider })

    const result = await service.explain(FACTS)
    expect(result.source).toBe('ai')
    expect(result.text).toBe(
      'Rahim owes ৳600 because he shared rice, chicken, and cooking oil, but only paid for snacks.',
    )
  })

  it('strips accidental surrounding quotes from the AI response', async () => {
    const provider = createFakeAIProvider('"Rahim owes ৳600 for shared groceries."')
    const service = createAIFairnessExplanationService({ provider })

    const result = await service.explain(FACTS)
    expect(result.text).toBe('Rahim owes ৳600 for shared groceries.')
  })

  it('sends the facts-derived prompt to the provider, not the raw settlement data', async () => {
    const provider = createFakeAIProvider('Rahim owes ৳600.')
    const service = createAIFairnessExplanationService({ provider })

    await service.explain(FACTS)
    expect(provider.requests).toHaveLength(1)
    expect(JSON.parse(provider.requests[0].userMessage).amount).toBe('৳600')
  })
})

describe('createAIFairnessExplanationService — never let AI change financial results', () => {
  it('discards an AI response that states the wrong amount and falls back to the deterministic template', async () => {
    const provider = createFakeAIProvider('Rahim owes ৳500 because he shared some groceries.')
    const service = createAIFairnessExplanationService({ provider })

    const result = await service.explain(FACTS)
    expect(result.source).toBe('template')
    expect(result.text).toContain('৳600')
    expect(result.text).not.toContain('৳500')
  })

  it('discards an AI response that omits the amount entirely', async () => {
    const provider = createFakeAIProvider('Rahim shared a lot of groceries with the household.')
    const service = createAIFairnessExplanationService({ provider })

    const result = await service.explain(FACTS)
    expect(result.source).toBe('template')
  })

  it('falls back to the template when the provider itself throws', async () => {
    const provider: AIProvider = {
      providerName: 'broken',
      complete: vi.fn().mockRejectedValue(new Error('network down')),
    }
    const service = createAIFairnessExplanationService({ provider })

    const result = await service.explain(FACTS)
    expect(result.source).toBe('template')
    expect(result.text).toContain('৳600')
  })

  it('uses a custom fallback when one is provided, instead of the default template', async () => {
    const provider = createFakeAIProvider('Rahim owes ৳999 — wrong number.')
    const customFallback: FairnessExplanationService = {
      explain: vi.fn().mockResolvedValue({ text: 'custom fallback text', source: 'template' }),
    }
    const service = createAIFairnessExplanationService({ provider, fallback: customFallback })

    const result = await service.explain(FACTS)
    expect(result.text).toBe('custom fallback text')
    expect(customFallback.explain).toHaveBeenCalledWith(FACTS)
  })

  it('never lets a hallucinated amount reach the returned text, even across many distinct wrong values', async () => {
    const wrongAmounts = ['৳1', '৳4200', '৳999999']
    for (const wrong of wrongAmounts) {
      const provider = createFakeAIProvider(`Rahim owes ${wrong} in total.`)
      const service = createAIFairnessExplanationService({ provider })
      const result = await service.explain(FACTS)
      expect(result.text).not.toContain(wrong)
      expect(result.source).toBe('template')
    }
  })
})
