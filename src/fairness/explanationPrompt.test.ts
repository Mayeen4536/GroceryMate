import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import type { MemberId } from '@/domain'
import { buildFairnessExplanationPrompt } from './explanationPrompt'
import type { SettlementExplanationFacts } from './explanationFacts'

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
  transfers: [{ counterpartyMemberId: 'member-mayeen' as MemberId, counterpartyName: 'Mayeen', amountMinorUnits: 60000 }],
}

describe('buildFairnessExplanationPrompt', () => {
  it('instructs the model never to calculate, alter, or invent anything', () => {
    const { systemPrompt } = buildFairnessExplanationPrompt(FACTS)
    expect(systemPrompt.toLowerCase()).toContain('do not calculate')
    expect(systemPrompt.toLowerCase()).toContain('exactly as written')
    expect(systemPrompt.toLowerCase()).toContain('do not perform any arithmetic')
  })

  it('sends the pre-formatted amount and item lists, and nothing about member ids or the household', () => {
    const { userMessage } = buildFairnessExplanationPrompt(FACTS)
    const parsed = JSON.parse(userMessage)

    expect(parsed).toEqual({
      memberName: 'Rahim',
      direction: 'owes',
      amount: '৳600',
      itemsPaidFor: ['snacks'],
      itemsSharedIn: ['rice', 'chicken', 'cooking oil', 'snacks'],
    })
    expect(userMessage).not.toContain('member-rahim')
    expect(userMessage).not.toContain('householdId')
  })

  it('sends a null amount for a settled member rather than "৳0"', () => {
    const { userMessage } = buildFairnessExplanationPrompt({ ...FACTS, direction: 'settled', amountMinorUnits: 0 })
    expect(JSON.parse(userMessage).amount).toBeNull()
  })
})
