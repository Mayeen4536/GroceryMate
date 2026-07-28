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
