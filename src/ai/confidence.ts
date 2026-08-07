/**
 * Deterministic confidence scoring for a parsed grocery line. Deliberately
 * not something the AI self-reports: LLM-reported confidence is
 * notoriously uncalibrated, so instead this is computed from concrete,
 * checkable signals about what was actually extracted.
 */
export interface ConfidenceSignals {
  readonly hasStatedPrice: boolean
  /** False when the sharing arrangement had to be defaulted rather than read from the text. */
  readonly sharedByWasExplicit: boolean
  /** True when the extracted payer name matches one of the household's known member names. */
  readonly payerMatchesKnownMember: boolean
}

const MISSING_PRICE_PENALTY = 0.25
const DEFAULTED_SHARING_PENALTY = 0.15
const UNRECOGNIZED_PAYER_PENALTY = 0.3

/** Always in [0, 1], rounded to two decimal places so results are stable to compare in tests. */
export function computeConfidence(signals: ConfidenceSignals): number {
  let score = 1
  if (!signals.hasStatedPrice) score -= MISSING_PRICE_PENALTY
  if (!signals.sharedByWasExplicit) score -= DEFAULTED_SHARING_PENALTY
  if (!signals.payerMatchesKnownMember) score -= UNRECOGNIZED_PAYER_PENALTY

  const clamped = Math.max(0, Math.min(1, score))
  return Math.round(clamped * 100) / 100
}
