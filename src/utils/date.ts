/**
 * Display-only date formatting for a persisted ISO timestamp
 * (`grocery_items.created_at` and similar). UTC throughout — matching the
 * same convention `src/members/types.ts`'s `formatLifecycleLabel` already
 * established for member lifecycle labels — so a given timestamp always
 * renders identically regardless of the viewer's local timezone. Never
 * used for calculation, only for grouping/labeling.
 */

const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' })
const MONTH_SHORT_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Sort/group key, e.g. "2026-07" — stable and locale-independent, unlike the display label. */
export function monthKey(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** '24' */
export function dayOfMonth(isoDate: string): string {
  return DAY_FORMAT.format(new Date(isoDate))
}

/** 'Jul' */
export function monthShort(isoDate: string): string {
  return MONTH_SHORT_FORMAT.format(new Date(isoDate))
}

/** 'Friday, Jul 24' */
export function fullDateLabel(isoDate: string): string {
  return FULL_DATE_FORMAT.format(new Date(isoDate))
}

/** 'July 2026' */
export function monthYearLabel(isoDate: string): string {
  return MONTH_YEAR_FORMAT.format(new Date(isoDate))
}
