import type { Currency } from '@/domain'
import type { SettlementExplanationFacts } from './explanationFacts'

export type ExplanationVerificationResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: string }

/**
 * The actual enforcement of "never let AI change financial results" —
 * not the prompt in `explanationPrompt.ts`, which is only a request a
 * model can ignore. This scans the AI's text for every amount written in
 * `facts.currency`'s symbol and rejects the response outright if any of
 * them doesn't match the one true calculated amount, or if the amount is
 * missing entirely. `aiExplanationService.ts` treats any non-`ok` result
 * as fatal and discards the AI's text in favor of the deterministic
 * template, which cannot fail this check by construction.
 */
export function verifyExplanationText(
  text: string,
  facts: SettlementExplanationFacts,
): ExplanationVerificationResult {
  const scale = 10 ** facts.currency.minorUnitDigits
  const expectedMajorAmount = facts.amountMinorUnits / scale
  const mentionedAmounts = extractCurrencyAmounts(text, facts.currency)

  if (facts.direction === 'settled') {
    if (mentionedAmounts.length > 0) {
      return { ok: false, reason: 'explanation mentions an amount for a member who is already settled up' }
    }
    return { ok: true }
  }

  if (mentionedAmounts.length === 0) {
    return { ok: false, reason: 'explanation does not mention the settlement amount at all' }
  }

  const mismatched = mentionedAmounts.filter((amount) => Math.abs(amount - expectedMajorAmount) > 1e-9)
  if (mismatched.length > 0) {
    return {
      ok: false,
      reason: `explanation mentions ${mismatched.join(', ')} which does not match the calculated amount ${expectedMajorAmount}`,
    }
  }

  return { ok: true }
}

function extractCurrencyAmounts(text: string, currency: Currency): readonly number[] {
  const escapedSymbol = currency.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escapedSymbol}\\s?([\\d,]+(?:\\.\\d+)?)`, 'g')
  const amounts: number[] = []
  for (const match of text.matchAll(pattern)) {
    amounts.push(Number(match[1].replace(/,/g, '')))
  }
  return amounts
}
