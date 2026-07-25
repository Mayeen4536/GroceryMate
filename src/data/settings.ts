/**
 * Display-only settings model. Selections live in local component state;
 * nothing here is persisted or wired to real preferences yet.
 */
export interface CurrencyOption {
  value: string
  label: string
}

export interface LanguageOption {
  value: string
  label: string
}

export interface NotificationSetting {
  key: string
  label: string
  description: string
}

export interface AccentOption {
  id: string
  label: string
  /** Solid dot class for the swatch. */
  dot: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'brand', label: 'Fresh green', dot: 'bg-brand-600' },
  { id: 'coral', label: 'Coral', dot: 'bg-member-coral-strong' },
  { id: 'sky', label: 'Sky', dot: 'bg-member-sky-strong' },
  { id: 'violet', label: 'Violet', dot: 'bg-member-violet-strong' },
  { id: 'gold', label: 'Gold', dot: 'bg-member-gold-strong' },
  { id: 'rose', label: 'Rose', dot: 'bg-member-rose-strong' },
  { id: 'teal', label: 'Teal', dot: 'bg-member-teal-strong' },
]

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'BDT', label: '৳ Bangladeshi Taka' },
  { value: 'USD', label: '$ US Dollar' },
  { value: 'EUR', label: '€ Euro' },
  { value: 'GBP', label: '£ British Pound' },
  { value: 'INR', label: '₹ Indian Rupee' },
]

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'ur', label: 'اردو (Urdu)' },
  { value: 'es', label: 'Español (Spanish)' },
]

export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: 'push',
    label: 'Push notifications',
    description: 'Get notified when someone adds groceries or settles up.',
  },
  {
    key: 'reminders',
    label: 'Settlement reminders',
    description: 'Nudge members who still owe the house.',
  },
  {
    key: 'digest',
    label: 'Weekly summary',
    description: "A Sunday recap of what your household spent.",
  },
]
