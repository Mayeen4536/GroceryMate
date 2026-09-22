import type { SettlementExplanationFacts } from './explanationFacts'
import { formatMinorUnits } from './moneyFormat'

export interface FairnessExplanationResult {
  readonly text: string
  /** Which implementation actually produced this text — lets a caller (or a test) tell a live AI explanation apart from the deterministic fallback. */
  readonly source: 'template' | 'ai'
}

/**
 * Turns already-computed `SettlementExplanationFacts` into an
 * easy-to-understand sentence. The contract every implementation must
 * honor: never state a number, name, item, or direction that isn't
 * already present in `facts` — nothing here is computed, only phrased.
 */
export interface FairnessExplanationService {
  explain(facts: SettlementExplanationFacts): Promise<FairnessExplanationResult>
}

/**
 * The deterministic default: a fixed sentence template, no AI involved.
 * Because it can only ever state what `facts` already says, it can never
 * violate "never let AI change financial results" — it's not AI at all.
 * Used as-is when no AI provider is configured, and as the fallback when
 * an AI-generated explanation fails verification (`aiExplanationService.ts`).
 */
export function createTemplateFairnessExplanationService(): FairnessExplanationService {
  return {
    async explain(facts: SettlementExplanationFacts): Promise<FairnessExplanationResult> {
      return { text: renderTemplate(facts), source: 'template' }
    },
  }
}

function renderTemplate(facts: SettlementExplanationFacts): string {
  if (facts.direction === 'settled') {
    return `${facts.memberName} is settled up — their spending and consumption balance out exactly.`
  }

  const amount = formatMinorUnits(facts.amountMinorUnits, facts.currency)
  const sharedList = describeItemList(facts.itemsSharedIn)
  const paidList = describeItemList(facts.itemsPaidFor)

  if (facts.direction === 'owes') {
    const paidClause =
      facts.itemsPaidFor.length === 0 ? "didn't pay for anything" : `only paid for ${paidList}`
    return `${facts.memberName} owes ${amount} because they shared ${sharedList}, but ${paidClause}.`
  }

  const sharedClause =
    facts.itemsSharedIn.length === 0 ? "didn't share in anything" : `only shared ${sharedList}`
  return `${facts.memberName} is owed ${amount} because they paid for ${paidList}, but ${sharedClause}.`
}

function describeItemList(names: readonly string[]): string {
  if (names.length === 0) return 'nothing'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}
