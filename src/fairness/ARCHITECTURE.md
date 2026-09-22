# AI Fairness Explanation system — architecture

Design for "Explain This Split": after a settlement is generated, a member
can ask why their number is what it is, and get back something like:

> Rahim owes ৳420 because he shared rice, chicken, and cooking oil, but
> only paid for snacks.

Three hard requirements from the spec, and how each is actually enforced
in code below, not just documented:

1. **"The explanation should always come from deterministic calculation
   data."** → `explanationFacts.ts`.
2. **"AI should only generate natural language."** → `explanationPrompt.ts`
   - `aiExplanationService.ts`.
3. **"Never let AI change financial results."** → `explanationVerification.ts`.

No UI (no "Explain This Split" button, no Settlements page change) is
built here — this is the service layer that a future button would call.

## Data flow

```
SettlementResult (engine/settlementEngine.ts, unchanged)
  + GroceryItem[], Member[]
        │
        ▼
buildFairnessExplanationFacts()          ← pure, deterministic, this module's core
        │
        ▼
SettlementExplanationFacts                (name, amount, direction, item-name lists)
        │
        ├──────────────────────────────┐
        ▼                              ▼
TemplateFairnessExplanationService   AIFairnessExplanationService
(fixed sentence, no AI)              (AIProvider.complete → verify → fallback)
        │                              │
        └──────────────┬───────────────┘
                        ▼
              FairnessExplanationResult { text, source: 'template' | 'ai' }
```

## Why facts are a separate step from phrasing

`buildFairnessExplanationFacts()` (`explanationFacts.ts`) reads only the
already-computed `SettlementResult` and the `GroceryItem`s it summarizes —
the same inputs `engine/settlementEngine.ts` already takes, unchanged.
It derives:

- `direction` (`'owes' | 'is_owed' | 'settled'`) and `amountMinorUnits`
  (always non-negative — direction carries the sign) from
  `MemberSettlementSummary.netBalanceMinorUnits`, which the engine already
  computed.
- `itemsPaidFor` / `itemsSharedIn` — item _names_, filtered straight from
  the `GroceryItem[]` by `paidByMemberId` / `sharedByMemberIds`. No price
  math happens here; the amount was already computed above.
- `transfers` — the subset of `SettlementResult.transfers` involving this
  member, with the counterparty's id resolved to a name.

Neither `FairnessExplanationService` implementation ever sees a
`GroceryItem`, a `SettlementResult`, or a `Member` — only this fact object.
That's what makes "always from deterministic data" a property of the
_types_, not just a rule someone has to remember to follow: there is no
raw data left in scope by the time either implementation runs, deterministic
or AI-backed, for it to recompute anything from.

## Two implementations, one contract

`FairnessExplanationService.explain(facts) → Promise<{text, source}>`
(`templateExplanationService.ts`) has exactly one contract: never state a
number, name, item, or direction that isn't already in `facts`.

- **`createTemplateFairnessExplanationService()`** — a fixed sentence
  template, no AI. Can't violate the contract by construction: it has
  nothing to draw on but the fields it was handed. This is what "AI should
  only generate natural language" implies in reverse — natural language
  generation is optional dressing, not a dependency; the feature works
  correctly with zero AI involved.
- **`createAIFairnessExplanationService({ provider, fallback? })`**
  (`aiExplanationService.ts`) — calls the existing `ai/AIProvider`
  abstraction (unchanged; Claude/OpenAI/Gemini/Fake all already work with
  it) with a prompt built by `buildFairnessExplanationPrompt(facts)`, then
  runs the response through `verifyExplanationText`. Only a response that
  passes is returned; anything else — a failed call, or text that fails
  verification — silently returns the fallback's result instead
  (`fallback` defaults to the template service).

Both return the same `FairnessExplanationResult` shape, so a caller can
swap one for the other, or wrap either in a UI-level toggle, without
changing anything downstream.

## The actual enforcement: `explanationVerification.ts`

`buildFairnessExplanationPrompt` tells the model, repeatedly, not to
calculate or alter any number — but a prompt is a request a model can
ignore, not a guarantee. `verifyExplanationText(text, facts)` is what
makes "never let AI change financial results" true regardless of what the
model does:

- It extracts every amount written next to `facts.currency`'s symbol
  (`৳420`, `৳4,200.50`, ...) and requires every single one to equal the
  one true `amountMinorUnits`, exactly (normalizing comma grouping and
  decimal formatting, not the number itself).
- A member who owes or is owed money must state the amount at all — an AI
  response that dodges the number entirely is rejected too, since the
  point of the feature is to communicate that number.
- A settled member's explanation must state no amount at all — there is
  nothing correct it could say.

Any failure — rejected text, or the provider call itself throwing — takes
the _entire_ AI path out of the result. `aiExplanationService.test.ts`
proves this directly: an AI response with a wrong, right, or missing
amount is fed in, and the fallback's amount (not the AI's) is what
survives to the caller every time.

## What's real vs. left for later

Everything in this module is fully implemented and tested — there is no
new external dependency to defer (unlike the receipt pipeline's OCR
stage): `ai/AIProvider` and its Claude/OpenAI/Gemini adapters already
exist, and this module only adds a new prompt and a new verification rule
on top of them. "Architecture only" here means: no UI wiring. Building
the "Explain This Split" button, calling this module from the Settlements
feature, and deciding whether a household needs to configure an
`AIProvider` at all (vs. always using the template) are the next,
UI-facing steps — deliberately not started.
