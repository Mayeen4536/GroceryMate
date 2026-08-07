import { describe, expect, it } from 'vitest'
import { computeConfidence } from './confidence'

const ALL_GOOD = { hasStatedPrice: true, sharedByWasExplicit: true, payerMatchesKnownMember: true }

describe('computeConfidence', () => {
  it('is 1 when every signal is positive', () => {
    expect(computeConfidence(ALL_GOOD)).toBe(1)
  })

  it('penalizes a missing stated price', () => {
    expect(computeConfidence({ ...ALL_GOOD, hasStatedPrice: false })).toBe(0.75)
  })

  it('penalizes a defaulted (non-explicit) sharing arrangement', () => {
    expect(computeConfidence({ ...ALL_GOOD, sharedByWasExplicit: false })).toBe(0.85)
  })

  it('penalizes a payer name that does not match any known member', () => {
    expect(computeConfidence({ ...ALL_GOOD, payerMatchesKnownMember: false })).toBe(0.7)
  })

  it('stacks penalties when several signals are negative', () => {
    expect(computeConfidence({ hasStatedPrice: false, sharedByWasExplicit: false, payerMatchesKnownMember: true })).toBe(
      0.6,
    )
  })

  it('never goes below 0 even when every signal is negative', () => {
    const score = computeConfidence({
      hasStatedPrice: false,
      sharedByWasExplicit: false,
      payerMatchesKnownMember: false,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('is a pure function: the same signals always produce the same score', () => {
    const signals = { hasStatedPrice: false, sharedByWasExplicit: true, payerMatchesKnownMember: false }
    expect(computeConfidence(signals)).toBe(computeConfidence({ ...signals }))
  })
})
