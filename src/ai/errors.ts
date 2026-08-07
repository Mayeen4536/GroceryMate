/** Base class for every error the AI grocery parser can throw. */
export class GroceryParserError extends Error {}

/** The underlying AI provider itself failed (network error, non-2xx response, etc.). */
export class AIProviderError extends GroceryParserError {
  readonly providerName: string

  constructor(providerName: string, cause: string) {
    super(`AI provider "${providerName}" failed: ${cause}`)
    this.name = 'AIProviderError'
    this.providerName = providerName
  }
}

/**
 * The provider responded, but the response wasn't parseable as JSON at
 * all — the AI likely wrote prose or otherwise ignored the requested
 * output format.
 */
export class AIResponseFormatError extends GroceryParserError {
  readonly rawResponse: string

  constructor(rawResponse: string) {
    super('AI response was not valid JSON.')
    this.name = 'AIResponseFormatError'
    this.rawResponse = rawResponse
  }
}

/**
 * The response was valid JSON, but not even loosely shaped like a
 * grocery-parse result (e.g. no `items` array at all).
 */
export class AIResponseSchemaError extends GroceryParserError {
  readonly rawResponse: unknown

  constructor(reason: string, rawResponse: unknown) {
    super(`AI response did not match the expected shape: ${reason}`)
    this.name = 'AIResponseSchemaError'
    this.rawResponse = rawResponse
  }
}
