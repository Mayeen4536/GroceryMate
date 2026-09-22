import type { AIProvider } from '@/ai'
import type { SettlementExplanationFacts } from './explanationFacts'
import { buildFairnessExplanationPrompt } from './explanationPrompt'
import { verifyExplanationText } from './explanationVerification'
import { createTemplateFairnessExplanationService } from './templateExplanationService'
import type { FairnessExplanationResult, FairnessExplanationService } from './templateExplanationService'

export interface AIFairnessExplanationServiceDeps {
  readonly provider: AIProvider
  /** Used whenever the AI call fails or its text doesn't verify. Defaults to the deterministic template, which can never fail verification by construction. */
  readonly fallback?: FairnessExplanationService
}

/**
 * Asks an AI provider to phrase already-computed facts into prose, then
 * verifies the result before trusting it — the concrete enforcement of
 * "AI should only generate natural language, never change financial
 * results." Any response that fails to call the provider, or whose text
 * doesn't pass `verifyExplanationText`, is discarded in favor of the
 * fallback rather than shown to the user. The AI never sees anything
 * besides the pre-computed `SettlementExplanationFacts`, and its output
 * never feeds back into any calculation — it produces display text only.
 */
export function createAIFairnessExplanationService(
  deps: AIFairnessExplanationServiceDeps,
): FairnessExplanationService {
  const fallback = deps.fallback ?? createTemplateFairnessExplanationService()

  return {
    async explain(facts: SettlementExplanationFacts): Promise<FairnessExplanationResult> {
      let rawText: string
      try {
        const { systemPrompt, userMessage } = buildFairnessExplanationPrompt(facts)
        rawText = await deps.provider.complete({ systemPrompt, userMessage })
      } catch {
        return fallback.explain(facts)
      }

      const text = stripSurroundingQuotes(rawText.trim())
      const verification = verifyExplanationText(text, facts)
      if (!verification.ok) {
        return fallback.explain(facts)
      }

      return { text, source: 'ai' }
    },
  }
}

function stripSurroundingQuotes(text: string): string {
  const match = /^["'](.*)["']$/s.exec(text)
  return match ? match[1] : text
}
