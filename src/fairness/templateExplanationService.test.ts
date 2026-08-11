import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import type { MemberId } from '@/domain'
import type { SettlementExplanationFacts } from './explanationFacts'
import { createTemplateFairnessExplanationService } from './templateExplanationService'

const RAHIM = 'member-rahim' as MemberId

function facts(overrides: Partial<SettlementExplanationFacts>): SettlementExplanationFacts {
  return {
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
    ...overrides,
  }
}

describe('createTemplateFairnessExplanationService', () => {
  const service = createTemplateFairnessExplanationService()

  it('renders the exact worked-example sentence shape for a member who owes money', async () => {
    const result = await service.explain(facts({}))
    expect(result).toEqual({
      text: 'Rahim owes ৳600 because they shared rice, chicken, cooking oil, and snacks, but only paid for snacks.',
      source: 'template',
    })
  })

  it('renders the mirrored sentence for a member who is owed money', async () => {
    const result = await service.explain(
      facts({
        memberName: 'Mayeen',
        direction: 'is_owed',
        itemsPaidFor: ['rice', 'chicken', 'cooking oil'],
        itemsSharedIn: ['rice', 'chicken', 'cooking oil', 'snacks'],
      }),
    )
    expect(result.text).toBe(
      'Mayeen is owed ৳600 because they paid for rice, chicken, and cooking oil, but only shared rice, chicken, cooking oil, and snacks.',
    )
  })

  it('renders a settled member without stating any amount', async () => {
    const result = await service.explain(facts({ direction: 'settled', amountMinorUnits: 0 }))
    expect(result.text).toBe('Rahim is settled up — their spending and consumption balance out exactly.')
    expect(result.text).not.toMatch(/৳/)
  })

  it('handles a single shared item without an awkward "and"', async () => {
    const result = await service.explain(facts({ itemsSharedIn: ['rice'] }))
    expect(result.text).toContain('shared rice,')
  })

  it('handles two shared items by joining with "and", no comma', async () => {
    const result = await service.explain(facts({ itemsSharedIn: ['rice', 'chicken'] }))
    expect(result.text).toContain('shared rice and chicken,')
  })

  it('says a member paid for nothing rather than an empty list', async () => {
    const result = await service.explain(facts({ itemsPaidFor: [] }))
    expect(result.text).toContain("didn't pay for anything")
  })

  it('says a member did not share in anything, for the is_owed direction', async () => {
    const result = await service.explain(
      facts({ direction: 'is_owed', itemsPaidFor: ['rice'], itemsSharedIn: [] }),
    )
    expect(result.text).toContain("didn't share in anything")
  })

  it('always tags its output with source "template"', async () => {
    const result = await service.explain(facts({}))
    expect(result.source).toBe('template')
  })
})
