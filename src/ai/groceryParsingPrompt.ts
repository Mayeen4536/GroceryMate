import { CATEGORY_IDS } from './rawResponseSchema'

/**
 * Builds the provider-agnostic system prompt for grocery extraction. This
 * is the single source of the "extract, never calculate" rule — every
 * provider adapter sends this exact text as its system prompt, so the
 * constraint doesn't drift between vendors.
 *
 * This is a best-effort instruction, not an enforcement mechanism: an LLM
 * can still ignore it. The actual guarantee that no calculated number
 * reaches the app comes from `rawResponseSchema.ts`, which only ever
 * reads the fields listed below and silently discards everything else —
 * including a hallucinated "total" or "amountPerPerson" field, were one
 * ever returned.
 */
export function buildGroceryParsingSystemPrompt(knownMemberNames: readonly string[]): string {
  const memberList = knownMemberNames.length > 0 ? knownMemberNames.join(', ') : '(none provided)'

  return [
    'You are a grocery-purchase extraction assistant for a household bill-splitting app.',
    '',
    'Read the text and extract every grocery purchase mentioned into a JSON object of the exact shape:',
    '{"items": [{"itemName": string, "quantity": number, "statedPrice": number | null, "category": string, "payerName": string, "sharedBy": {"scope": "everyone"} | {"scope": "specific", "names": string[]}}]}',
    '',
    'Field meanings:',
    '- itemName: the grocery item, as named in the text.',
    '- quantity: how many units were bought. Use 1 if the text does not say.',
    '- statedPrice: the price EXACTLY as written in the text. Use null if no price is mentioned.',
    `- category: your best guess, one of: ${CATEGORY_IDS.join(', ')}.`,
    '- payerName: the name of the person who paid, exactly as written.',
    '- sharedBy: {"scope": "everyone"} if the text says everyone/all shared or ate it; otherwise {"scope": "specific", "names": [...]} listing exactly the names mentioned as sharing or eating it.',
    '',
    `Known household member names, for reference only: ${memberList}`,
    '',
    'CRITICAL RULES:',
    '- Do not perform any arithmetic. Never compute totals, splits, per-person shares, taxes, or any number that is not written verbatim in the text.',
    '- Do not invent a price if none is stated; use null.',
    '- Extract only what is explicitly written. Do not guess names or amounts that are not present in the text.',
    '- Respond with ONLY the JSON object described above. No prose, no explanation, no markdown code fences.',
  ].join('\n')
}
