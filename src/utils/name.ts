/** First token of a full name, e.g. "Aisha Khan" -> "Aisha". */
export function firstName(name: string): string {
  return name.split(' ')[0]
}
