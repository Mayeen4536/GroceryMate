import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain'
import type { MemberId } from '@/domain'
import type { SettlementExplanationFacts } from './explanationFacts'
import { verifyExplanationText } from './explanationVerification'

const RAHIM = 'member-rahim' as MemberId

const OWES_FACTS: SettlementExplanationFacts = {
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

const SETTLED_FACTS: SettlementExplanationFacts = { ...OWES_FACTS, direction: 'settled', amountMinorUnits: 0 }

describe('verifyExplanationText', () => {
  it('accepts text that states exactly the calculated amount', () => {
    expect(
      verifyExplanationText('Rahim owes ৳600 because he shared rice, chicken, and cooking oil.', OWES_FACTS),
    ).toEqual({
      ok: true,
    })
  })

  it('accepts the amount written with comma grouping or trailing decimals, since the value still matches', () => {
    expect(verifyExplanationText('Rahim owes ৳600.00 in total.', OWES_FACTS)).toEqual({ ok: true })
    expect(
      verifyExplanationText('Rahim owes ৳6,00 nonsense grouping but same value.', {
        ...OWES_FACTS,
        amountMinorUnits: 60000,
      }),
    ).toEqual({ ok: true })
  })

  it('rejects text that states a different amount than the calculated one', () => {
    const result = verifyExplanationText('Rahim owes ৳500 for shared groceries.', OWES_FACTS)
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('500') })
  })

  it('rejects text that never mentions any amount at all', () => {
    const result = verifyExplanationText('Rahim shared some groceries with the household.', OWES_FACTS)
    expect(result).toEqual({ ok: false, reason: 'explanation does not mention the settlement amount at all' })
  })

  it('rejects text for a settled member that invents an amount anyway', () => {
    const result = verifyExplanationText('Rahim owes ৳100 still.', SETTLED_FACTS)
    expect(result.ok).toBe(false)
  })

  it('accepts text for a settled member that states no amount', () => {
    expect(verifyExplanationText('Rahim is all settled up with the household.', SETTLED_FACTS)).toEqual({
      ok: true,
    })
  })

  it('rejects when a second, contradicting amount is mentioned alongside the correct one', () => {
    const result = verifyExplanationText('Rahim owes ৳600, or maybe ৳620 depending on rounding.', OWES_FACTS)
    expect(result.ok).toBe(false)
  })

  it('works with a non-Latin currency symbol without regex errors', () => {
    const inrFacts: SettlementExplanationFacts = { ...OWES_FACTS, currency: CURRENCIES.INR }
    expect(verifyExplanationText('Rahim owes ₹600 total.', inrFacts)).toEqual({ ok: true })
  })
})
