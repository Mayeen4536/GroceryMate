import type { SettlementExplanationFacts } from './explanationFacts'
import { formatMinorUnits } from './moneyFormat'

export interface FairnessExplanationPrompt {
  readonly systemPrompt: string
  readonly userMessage: string
}

/**
 * Builds the prompt for turning facts into prose. Every number and name
 * the AI could possibly need is handed to it explicitly, pre-formatted,
 * and the system prompt states — repeatedly and unambiguously — that
 * none of it may be changed. This is belt-and-suspenders: the actual
 * enforcement is `explanationVerification.ts`, not this prompt, but
 * stating the constraint up front measurably reduces how often the
 * verification step needs to reject a response at all.
 */
export function buildFairnessExplanationPrompt(facts: SettlementExplanationFacts): FairnessExplanationPrompt {
  const systemPrompt = [
    'You write one short, friendly sentence explaining a household grocery settlement to a member.',
    'You will be given already-calculated facts as JSON. Restate them in plain language only.',
    'Rules, no exceptions:',
    '- Do not calculate, estimate, round, or alter any amount. Use the given amount exactly as written.',
    '- Do not add, omit, or rename any item.',
    '- Do not mention any member, item, or amount that is not present in the given facts.',
    '- Do not perform any arithmetic of any kind.',
    '- Respond with the explanation sentence only — no preamble, no markdown, no surrounding quotes.',
  ].join('\n')

  const userMessage = JSON.stringify({
    memberName: facts.memberName,
    direction: facts.direction,
    amount: facts.direction === 'settled' ? null : formatMinorUnits(facts.amountMinorUnits, facts.currency),
    itemsPaidFor: facts.itemsPaidFor,
    itemsSharedIn: facts.itemsSharedIn,
  })

  return { systemPrompt, userMessage }
}
