# Receipt scanning pipeline — architecture

Design for the flow: **Upload → OCR → AI Cleanup → Parsed Groceries → User
Confirmation → Settlement Engine.** This document explains the stage
boundaries and where each one's code lives. No OCR vendor and no backend
are implemented here — see "What's real vs. stubbed" below.

## Why six boxes become five services, not one pipeline

Two of the diagram's boxes involve a human (submitting a photo, reviewing
candidates). A function can't "run" a human, so the architecture doesn't
try to model Upload and User Confirmation as pipeline stages an
orchestrator calls in sequence. Instead there are five independently
callable pieces, and only the three fully-automated middle stages are
wired into one orchestrator:

```
ReceiptUploadService          (stage: Upload)
        │  produces a Receipt
        ▼
ReceiptScanningPipeline        (stages: OCR → AI Cleanup → Parsed Groceries)
        │  produces AIParsedItem[] candidates
        ▼
   ... human review happens here, outside any of this code ...
        ▼
ReceiptConfirmationService     (stage: User Confirmation)
        │  produces GroceryItem[]
        ▼
computeSettlement()            (stage: Settlement Engine — already built, untouched)
```

A caller (the future UI layer) is what strings these five together; none
of them call each other directly except inside `ReceiptScanningPipeline`,
where OCR → Cleanup → Parse genuinely is a single uninterrupted sequence.

## Stage by stage

### 1. Upload — `receiptUploadService.ts`

Turns whatever a member just submitted (a photo's `imageUrl`, or pasted
text) into a `Receipt` domain record (`@/domain/Receipt.ts`, built two
tasks ago) with `processingStatus: 'pending'`. Pure construction, no I/O —
persisting the result is deliberately not this stage's job; a future
`ReceiptRepository` would follow the same shape as
`persistence/historySessionRepository.ts` and sit downstream of this
service, not inside it.

### 2–4. OCR → AI Cleanup → Parsed Groceries — `src/ocr/` + `receiptScanningPipeline.ts` + `@/ai`

These three are automated end to end, so they're one orchestrator:
`createReceiptScanningPipeline(deps).run(input)`.

- **OCR** (`src/ocr/OCRProvider.ts`) — `OCRProvider.extractText({ imageUrl })
  → { rawText, confidence? }`. Vendor-agnostic by design, mirroring
  `ai/AIProvider.ts`: the pipeline depends only on this interface, never on
  Tesseract/Google Vision/AWS Textract/Azure specifically. Skipped
  entirely for a pasted-text receipt — there's no image to read, so the
  pasted text flows straight into cleanup.
- **AI Cleanup** (`receiptTextCleanupService.ts`) — `ReceiptTextCleanupService.clean(rawText)
  → { cleanedText }`. Fixes OCR noise (misread characters, broken line
  structure) before parsing sees it. Kept as its own stage rather than
  folded into extraction, because "fix the text" and "extract structure
  from the text" are different concerns with different failure modes —
  splitting them means either can be swapped or tested without touching
  the other.
- **Parsed Groceries** — the cleaned text is hemmed straight into the
  already-built `ai/groceryParser.ts` (`GroceryParser.parse(...)`), which
  turns it into `AIParsedItem[]` candidates. Nothing new was built here;
  the pipeline just wires up what already exists rather than duplicating
  it.

### 5. User Confirmation — `receiptConfirmationService.ts`

A member reviews each `AIParsedItem` candidate, corrects anything the AI
guessed wrong, and — critically — resolves `parsedPayerName` /
`parsedSharedBy`'s *names* into real `MemberId`s (name-to-member matching
is a UI concern: a dropdown of the household's actual members, not fuzzy
string matching in this layer). `ReceiptConfirmationService.confirm(...)`
then does the mechanical, deterministic part: assembling those confirmed
fields into a real `GroceryItem`. No AI, no OCR, no arithmetic — which is
exactly why, unlike OCR and AI Cleanup, this stage has a real
implementation already rather than a stub.

### 6. Settlement Engine — unchanged

`ConfirmedGroceryItem.groceryItem` values are exactly the shape
`engine/settlementEngine.ts`'s `computeSettlement(members, groceries,
currency)` already expects as input. This pipeline does not call the
engine itself: a settlement recompute is a household-wide operation that
should happen whenever the grocery list changes, not something one
receipt's confirmation should trigger unilaterally. The engine's existing
signature is untouched.

## What's real vs. stubbed, and why

| Piece | Status | Why |
|---|---|---|
| `ReceiptUploadService` | Real | Pure entity construction, no backend needed. |
| `OCRProvider` | Interface + `NotImplementedOCRProvider` stub for every vendor | Genuinely needs a vendor choice/dependency not yet made — no honest fallback exists (you can't approximate reading an image). |
| `ReceiptTextCleanupService` | Interface + passthrough default | A real version would reuse `AIProvider` with a cleanup-specific prompt, same pattern as `groceryParser.ts`. Left unbuilt since this task is architecture-only; "don't clean" is a safe, honest default in the meantime — the pipeline still runs end to end on whatever text it gets. |
| Grocery parsing | Real (reused from `@/ai`, unchanged) | Already built and tested; connecting to it is wiring, not new implementation. |
| `ReceiptConfirmationService` | Real | Deterministic assembly, no external dependency to defer. |
| Settlement engine | Real (unchanged) | Out of scope for this task; the pipeline only documents the connection. |

## Multi-provider support

`createOCRProvider({ vendor, apiKey?, baseUrl? })`
(`src/ocr/providers/createOCRProvider.ts`) is the single vendor-aware seam,
mirroring `ai/providers/createAIProvider.ts`. It already switches on
`OCRProviderVendor` (`'tesseract' | 'google-vision' | 'aws-textract' |
'azure-vision'`); every case currently returns
`createNotImplementedOCRProvider(vendor)`. Adding a real vendor later
means adding one adapter file and one switch case — nothing that depends
on `OCRProvider` (the pipeline, tests, future UI) changes.

## Replaceability

Every stage is consumed only through its interface:
`ReceiptUploadService`, `OCRProvider`, `ReceiptTextCleanupService`,
`GroceryParser`, `ReceiptConfirmationService`. `createReceiptScanningPipeline`
takes all three of its dependencies through `ReceiptScanningPipelineDeps`,
so a test — or a future real implementation — can swap any one of them
without touching the orchestrator or any other stage.

## Security note (carried forward from the AI parser task)

A future real `OCRProvider` calling a cloud vendor (Google Vision, AWS
Textract, Azure) directly from browser code would expose that vendor's API
key client-side, the same concern already documented for `AIProvider`.
`OCRProviderConfig.baseUrl` exists for the same reason `AIProviderConfig`'s
does: to allow routing through a backend proxy once one exists, instead of
calling the vendor directly. No backend exists yet, so this is a design
placeholder, not a working mitigation.
