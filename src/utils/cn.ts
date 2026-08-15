import { twMerge } from 'tailwind-merge'

export type ClassValue = string | false | null | undefined

/**
 * Joins class name fragments, resolving Tailwind conflicts by the last one
 * present rather than a plain string join. A plain join means a caller's
 * `className="w-40"` silently loses to a component's own later `w-full` —
 * same CSS specificity, last one declared wins regardless of prop order —
 * exactly the bug that made `HistoryPage`'s month filter always render
 * full-width. `twMerge` understands Tailwind's own utility groups, so the
 * last conflicting utility for the *same property* wins instead.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(values.filter(Boolean).join(' '))
}
