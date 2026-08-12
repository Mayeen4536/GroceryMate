/**
 * The validated 8-slot categorical palette (`--color-series-*` in index.css),
 * exposed as literal Tailwind class name arrays. Literal strings, never a
 * template-built `text-series-${n}` — Tailwind's scanner only generates a
 * utility for class names it can see written out in source.
 *
 * Slot assignment must come from the entity's fixed identity (its index in
 * `CATEGORIES` or `initialMembers`), never from its rank in a sorted list —
 * otherwise a category or member would repaint to a different color
 * whenever the data changes. See `useAnalytics.ts`'s `colorSlot` fields.
 */
const SERIES_TEXT: readonly string[] = [
  'text-series-1',
  'text-series-2',
  'text-series-3',
  'text-series-4',
  'text-series-5',
  'text-series-6',
  'text-series-7',
  'text-series-8',
]

const SERIES_BG: readonly string[] = [
  'bg-series-1',
  'bg-series-2',
  'bg-series-3',
  'bg-series-4',
  'bg-series-5',
  'bg-series-6',
  'bg-series-7',
  'bg-series-8',
]

/** Text/icon/SVG-fill (via `fill="currentColor"`) color class for a fixed series slot. */
export function seriesTextClass(slot: number): string {
  return SERIES_TEXT[slot % SERIES_TEXT.length]
}

/** Solid background color class for a fixed series slot — bars, legend swatches. */
export function seriesBgClass(slot: number): string {
  return SERIES_BG[slot % SERIES_BG.length]
}
