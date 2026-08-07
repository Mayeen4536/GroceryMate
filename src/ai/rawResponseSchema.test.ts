import { describe, expect, it } from 'vitest'
import { AIResponseFormatError, AIResponseSchemaError } from './errors'
import { parseAIResponseText, validateGroceryParseResponse } from './rawResponseSchema'

describe('parseAIResponseText', () => {
  it('parses plain JSON', () => {
    expect(parseAIResponseText('{"items": []}')).toEqual({ items: [] })
  })

  it('strips a ```json fenced code block', () => {
    const text = '```json\n{"items": []}\n```'
    expect(parseAIResponseText(text)).toEqual({ items: [] })
  })

  it('strips a plain ``` fenced code block (no "json" language tag)', () => {
    const text = '```\n{"items": []}\n```'
    expect(parseAIResponseText(text)).toEqual({ items: [] })
  })

  it('throws AIResponseFormatError when the text is not JSON at all', () => {
    expect(() => parseAIResponseText('Sure! Here is what I found: rice and chicken.')).toThrow(
      AIResponseFormatError,
    )
  })

  it('throws AIResponseFormatError for JSON that is merely truncated or malformed', () => {
    expect(() => parseAIResponseText('{"items": [')).toThrow(AIResponseFormatError)
  })
})

describe('validateGroceryParseResponse', () => {
  it('accepts a well-formed response with multiple lines', () => {
    const result = validateGroceryParseResponse({
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

    expect(result.skipped).toEqual([])
    expect(result.validLines).toHaveLength(2)
    expect(result.validLines[0]).toEqual({
      itemName: 'rice',
      quantity: 1,
      statedPrice: 800,
      category: 'pantry',
      payerName: 'Mayeen',
      sharedBy: { scope: 'everyone' },
      sharedByWasExplicit: true,
    })
    expect(result.validLines[1].sharedBy).toEqual({ scope: 'specific', names: ['Rahim', 'Karim'] })
  })

  it('throws AIResponseSchemaError when the response is not an object', () => {
    expect(() => validateGroceryParseResponse('not an object')).toThrow(AIResponseSchemaError)
    expect(() => validateGroceryParseResponse(null)).toThrow(AIResponseSchemaError)
    expect(() => validateGroceryParseResponse([1, 2, 3])).toThrow(AIResponseSchemaError)
  })

  it('throws AIResponseSchemaError when there is no "items" array', () => {
    expect(() => validateGroceryParseResponse({})).toThrow(AIResponseSchemaError)
    expect(() => validateGroceryParseResponse({ items: 'not an array' })).toThrow(AIResponseSchemaError)
  })

  it('skips a line with no itemName instead of failing the whole batch', () => {
    const result = validateGroceryParseResponse({
      items: [
        { quantity: 1, payerName: 'Mayeen', sharedBy: { scope: 'everyone' } },
        { itemName: 'rice', payerName: 'Mayeen', sharedBy: { scope: 'everyone' } },
      ],
    })
    expect(result.validLines).toHaveLength(1)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].reason).toMatch(/itemName/)
  })

  it('skips a line with no payerName instead of failing the whole batch', () => {
    const result = validateGroceryParseResponse({
      items: [{ itemName: 'rice', sharedBy: { scope: 'everyone' } }],
    })
    expect(result.validLines).toHaveLength(0)
    expect(result.skipped[0].reason).toMatch(/payerName/)
  })

  it('skips a line that is not an object at all (e.g. a bare string)', () => {
    const result = validateGroceryParseResponse({ items: ['rice'] })
    expect(result.validLines).toHaveLength(0)
    expect(result.skipped[0].reason).toMatch(/not an object/)
  })

  it('defaults quantity to 1 when missing, zero, negative, or non-numeric', () => {
    for (const badQuantity of [undefined, 0, -3, 'a lot', null]) {
      const result = validateGroceryParseResponse({
        items: [{ itemName: 'rice', payerName: 'Mayeen', quantity: badQuantity, sharedBy: { scope: 'everyone' } }],
      })
      expect(result.validLines[0].quantity).toBe(1)
    }
  })

  it('coerces a numeric-string quantity and rounds a fractional one', () => {
    const result = validateGroceryParseResponse({
      items: [
        { itemName: 'a', payerName: 'X', quantity: '3', sharedBy: { scope: 'everyone' } },
        { itemName: 'b', payerName: 'X', quantity: 2.6, sharedBy: { scope: 'everyone' } },
      ],
    })
    expect(result.validLines[0].quantity).toBe(3)
    expect(result.validLines[1].quantity).toBe(3)
  })

  it('treats a missing or invalid statedPrice as null rather than guessing a number', () => {
    for (const badPrice of [undefined, null, 'free', -5, NaN]) {
      const result = validateGroceryParseResponse({
        items: [{ itemName: 'rice', payerName: 'Mayeen', statedPrice: badPrice, sharedBy: { scope: 'everyone' } }],
      })
      expect(result.validLines[0].statedPrice).toBeNull()
    }
  })

  it('coerces a numeric-string statedPrice', () => {
    const result = validateGroceryParseResponse({
      items: [{ itemName: 'rice', payerName: 'Mayeen', statedPrice: '800', sharedBy: { scope: 'everyone' } }],
    })
    expect(result.validLines[0].statedPrice).toBe(800)
  })

  it('normalizes category case and falls back to "pantry" for an unrecognized one', () => {
    const result = validateGroceryParseResponse({
      items: [
        { itemName: 'rice', payerName: 'X', category: 'PANTRY', sharedBy: { scope: 'everyone' } },
        { itemName: 'chicken', payerName: 'X', category: 'meat', sharedBy: { scope: 'everyone' } },
        { itemName: 'soap', payerName: 'X', sharedBy: { scope: 'everyone' } },
      ],
    })
    expect(result.validLines[0].category).toBe('pantry')
    expect(result.validLines[1].category).toBe('pantry')
    expect(result.validLines[2].category).toBe('pantry')
  })

  it('recognizes "everyone" sharing', () => {
    const result = validateGroceryParseResponse({
      items: [{ itemName: 'rice', payerName: 'Mayeen', sharedBy: { scope: 'everyone' } }],
    })
    expect(result.validLines[0].sharedBy).toEqual({ scope: 'everyone' })
    expect(result.validLines[0].sharedByWasExplicit).toBe(true)
  })

  it('recognizes specific named sharers and trims whitespace, dropping blank entries', () => {
    const result = validateGroceryParseResponse({
      items: [
        {
          itemName: 'chicken',
          payerName: 'Rahim',
          sharedBy: { scope: 'specific', names: [' Rahim ', 'Karim', '', '  '] },
        },
      ],
    })
    expect(result.validLines[0].sharedBy).toEqual({ scope: 'specific', names: ['Rahim', 'Karim'] })
  })

  it('defaults sharedBy to the payer alone when missing or malformed, flagging it as not explicit', () => {
    for (const badSharedBy of [undefined, null, {}, { scope: 'specific', names: [] }, { scope: 'unknown' }]) {
      const result = validateGroceryParseResponse({
        items: [{ itemName: 'rice', payerName: 'Mayeen', sharedBy: badSharedBy }],
      })
      expect(result.validLines[0].sharedBy).toEqual({ scope: 'specific', names: ['Mayeen'] })
      expect(result.validLines[0].sharedByWasExplicit).toBe(false)
    }
  })

  it('never surfaces a calculated field even if the AI hallucinated one', () => {
    // Simulates a model ignoring instructions and inventing derived numbers.
    const result = validateGroceryParseResponse({
      items: [
        {
          itemName: 'rice',
          payerName: 'Mayeen',
          statedPrice: 800,
          sharedBy: { scope: 'everyone' },
          totalPrice: 800,
          amountPerPerson: 266.67,
          splitAmount: 200,
        },
      ],
    })
    expect(result.validLines).toHaveLength(1)
    const keys = Object.keys(result.validLines[0])
    expect(keys).not.toContain('totalPrice')
    expect(keys).not.toContain('amountPerPerson')
    expect(keys).not.toContain('splitAmount')
    expect(keys.sort()).toEqual(
      ['category', 'itemName', 'payerName', 'quantity', 'sharedBy', 'sharedByWasExplicit', 'statedPrice'].sort(),
    )
  })
})
