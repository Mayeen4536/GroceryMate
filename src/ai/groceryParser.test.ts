import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { HouseholdId } from '@/domain/ids'
import { AIResponseFormatError } from './errors'
import { createGroceryParser } from './groceryParser'
import { createFakeAIProvider } from './providers/FakeAIProvider'

const HOUSEHOLD_ID = 'household-1' as HouseholdId

function makeDeterministicIdGenerator(prefix: string) {
  let counter = 0
  return () => {
    counter += 1
    return `${prefix}-${counter}`
  }
}

const WORKED_EXAMPLE_TEXT = [
  'Mayeen bought rice for 800.',
  'Everyone shared it.',
  '',
  'Rahim bought chicken for 500.',
  'Only Rahim and Karim ate it.',
].join('\n')

const WORKED_EXAMPLE_RESPONSE = JSON.stringify({
  items: [
    {
      itemName: 'rice',
      quantity: 1,
      statedPrice: 800,
      category: 'pantry',
      payerName: 'Mayeen',
      sharedBy: { scope: 'everyone' },
    },
    {
      itemName: 'chicken',
      quantity: 1,
      statedPrice: 500,
      category: 'pantry',
      payerName: 'Rahim',
      sharedBy: { scope: 'specific', names: ['Rahim', 'Karim'] },
    },
  ],
})

describe('createGroceryParser — the worked example from the spec', () => {
  it('turns "Mayeen bought rice..." / "Rahim bought chicken..." into two structured candidates', async () => {
    const provider = createFakeAIProvider(WORKED_EXAMPLE_RESPONSE)
    const parser = createGroceryParser({ provider, generateId: makeDeterministicIdGenerator('parsed') })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: WORKED_EXAMPLE_TEXT,
      knownMemberNames: ['Mayeen', 'Rahim', 'Karim'],
      currency: CURRENCIES.BDT,
    })

    expect(result.skipped).toEqual([])
    expect(result.items).toHaveLength(2)

    const [rice, chicken] = result.items
    expect(rice).toEqual({
      id: 'parsed-1',
      householdId: HOUSEHOLD_ID,
      parsedName: 'rice',
      parsedCategory: 'pantry',
      parsedQuantity: 1,
      parsedPayerName: 'Mayeen',
      parsedSharedBy: { scope: 'everyone' },
      confidence: 1,
      reviewed: false,
      origin: 'prompt',
      promptText: WORKED_EXAMPLE_TEXT,
      parsedUnitPrice: { minorUnits: 80000, currency: CURRENCIES.BDT },
    })
    expect(chicken).toEqual({
      id: 'parsed-2',
      householdId: HOUSEHOLD_ID,
      parsedName: 'chicken',
      parsedCategory: 'pantry',
      parsedQuantity: 1,
      parsedPayerName: 'Rahim',
      parsedSharedBy: { scope: 'specific', names: ['Rahim', 'Karim'] },
      confidence: 1,
      reviewed: false,
      origin: 'prompt',
      promptText: WORKED_EXAMPLE_TEXT,
      parsedUnitPrice: { minorUnits: 50000, currency: CURRENCIES.BDT },
    })
  })

  it('sends the extraction-only prompt and the raw text to the provider, unmodified', async () => {
    const provider = createFakeAIProvider(WORKED_EXAMPLE_RESPONSE)
    const parser = createGroceryParser({ provider })

    await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: WORKED_EXAMPLE_TEXT,
      knownMemberNames: ['Mayeen', 'Rahim', 'Karim'],
      currency: CURRENCIES.BDT,
    })

    expect(provider.requests).toHaveLength(1)
    expect(provider.requests[0].userMessage).toBe(WORKED_EXAMPLE_TEXT)
    expect(provider.requests[0].systemPrompt).toContain('Mayeen, Rahim, Karim')
    expect(provider.requests[0].systemPrompt.toLowerCase()).toContain('do not perform any arithmetic')
  })
})

describe('createGroceryParser — the "AI never calculates money" guarantee', () => {
  it('never lets a hallucinated calculated field reach the output, even if the AI includes one', async () => {
    const provider = createFakeAIProvider(
      JSON.stringify({
        items: [
          {
            itemName: 'rice',
            statedPrice: 800,
            payerName: 'Mayeen',
            sharedBy: { scope: 'everyone' },
            // A model ignoring instructions and computing a split anyway:
            totalCost: 800,
            splitPerPerson: 266.67,
            amountOwedByEachMember: { Mayeen: 0, Rahim: 266.67, Karim: 266.67 },
          },
        ],
      }),
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'irrelevant',
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect(result.items).toHaveLength(1)
    const keys = Object.keys(result.items[0])
    expect(keys).not.toContain('totalCost')
    expect(keys).not.toContain('splitPerPerson')
    expect(keys).not.toContain('amountOwedByEachMember')
    // The only money-shaped field present is the one this module computed itself.
    expect(result.items[0].parsedUnitPrice).toEqual({ minorUnits: 80000, currency: CURRENCIES.BDT })
  })

  it('never invents a price when none was stated in the text', async () => {
    const provider = createFakeAIProvider(
      JSON.stringify({
        items: [{ itemName: 'milk', payerName: 'Mayeen', statedPrice: null, sharedBy: { scope: 'everyone' } }],
      }),
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'Mayeen bought milk.',
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect('parsedUnitPrice' in result.items[0]).toBe(false)
  })
})

describe('createGroceryParser — robustness', () => {
  it('reports a malformed line as skipped instead of failing the whole parse', async () => {
    const provider = createFakeAIProvider(
      JSON.stringify({
        items: [
          { itemName: 'rice', payerName: 'Mayeen', statedPrice: 800, sharedBy: { scope: 'everyone' } },
          { itemName: 'mystery item with no payer' },
        ],
      }),
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'irrelevant',
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })

    expect(result.items).toHaveLength(1)
    expect(result.skipped).toHaveLength(1)
  })

  it('strips a ```json fenced response before parsing', async () => {
    const provider = createFakeAIProvider(
      '```json\n' +
        JSON.stringify({ items: [{ itemName: 'rice', payerName: 'Mayeen', sharedBy: { scope: 'everyone' } }] }) +
        '\n```',
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'irrelevant',
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })
    expect(result.items).toHaveLength(1)
  })

  it('propagates AIResponseFormatError when the provider replies with prose instead of JSON', async () => {
    const provider = createFakeAIProvider('Sure, here is what I found: rice bought by Mayeen for 800.')
    const parser = createGroceryParser({ provider })

    await expect(
      parser.parse({
        householdId: HOUSEHOLD_ID,
        text: 'irrelevant',
        knownMemberNames: ['Mayeen'],
        currency: CURRENCIES.BDT,
      }),
    ).rejects.toThrow(AIResponseFormatError)
  })

  it('lowers confidence when the payer is not one of the known household members', async () => {
    const provider = createFakeAIProvider(
      JSON.stringify({
        items: [{ itemName: 'rice', payerName: 'SomeStranger', statedPrice: 800, sharedBy: { scope: 'everyone' } }],
      }),
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'irrelevant',
      knownMemberNames: ['Mayeen', 'Rahim'],
      currency: CURRENCIES.BDT,
    })
    expect(result.items[0].confidence).toBeLessThan(1)
  })

  it('matches known member names case-insensitively for confidence scoring', async () => {
    const provider = createFakeAIProvider(
      JSON.stringify({
        items: [{ itemName: 'rice', payerName: 'mayeen', statedPrice: 800, sharedBy: { scope: 'everyone' } }],
      }),
    )
    const parser = createGroceryParser({ provider })

    const result = await parser.parse({
      householdId: HOUSEHOLD_ID,
      text: 'irrelevant',
      knownMemberNames: ['Mayeen'],
      currency: CURRENCIES.BDT,
    })
    expect(result.items[0].confidence).toBe(1)
  })

  it('is deterministic: the same input and deterministic id generator always produce the same output', async () => {
    const run = async () => {
      const provider = createFakeAIProvider(WORKED_EXAMPLE_RESPONSE)
      const parser = createGroceryParser({ provider, generateId: makeDeterministicIdGenerator('parsed') })
      return parser.parse({
        householdId: HOUSEHOLD_ID,
        text: WORKED_EXAMPLE_TEXT,
        knownMemberNames: ['Mayeen', 'Rahim', 'Karim'],
        currency: CURRENCIES.BDT,
      })
    }

    expect(await run()).toEqual(await run())
  })
})
