import { describe, expect, it } from 'vitest'
import { buildGroceryParsingSystemPrompt } from './groceryParsingPrompt'

describe('buildGroceryParsingSystemPrompt', () => {
  it('instructs the model never to perform arithmetic', () => {
    const prompt = buildGroceryParsingSystemPrompt([])
    expect(prompt.toLowerCase()).toContain('do not perform any arithmetic')
  })

  it('instructs the model to extract only, and to reply with JSON only', () => {
    const prompt = buildGroceryParsingSystemPrompt([])
    expect(prompt.toLowerCase()).toContain('extract only what is explicitly written')
    expect(prompt.toLowerCase()).toContain('respond with only')
  })

  it('describes the exact expected JSON shape, including sharedBy scopes', () => {
    const prompt = buildGroceryParsingSystemPrompt([])
    expect(prompt).toContain('"items"')
    expect(prompt).toContain('"itemName"')
    expect(prompt).toContain('"statedPrice"')
    expect(prompt).toContain('"payerName"')
    expect(prompt).toContain('"scope": "everyone"')
    expect(prompt).toContain('"scope": "specific"')
  })

  it('lists every valid grocery category', () => {
    const prompt = buildGroceryParsingSystemPrompt([])
    for (const category of ['produce', 'dairy', 'bakery', 'pantry', 'beverages', 'household']) {
      expect(prompt).toContain(category)
    }
  })

  it('includes the known member names when given', () => {
    const prompt = buildGroceryParsingSystemPrompt(['Mayeen', 'Rahim', 'Karim'])
    expect(prompt).toContain('Mayeen, Rahim, Karim')
  })

  it('is honest about there being no known members instead of omitting the section', () => {
    const prompt = buildGroceryParsingSystemPrompt([])
    expect(prompt).toContain('(none provided)')
  })
})
