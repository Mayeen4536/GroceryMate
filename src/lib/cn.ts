export type ClassValue = string | false | null | undefined

/** Joins truthy class name fragments. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
