import { en } from './en'
import { it } from './it'
import type { TranslationKeys } from './types'

export type AppLocale = 'it' | 'en'
export type { TranslationKeys }

/** Italian is the only active language for now. */
export const DEFAULT_LOCALE: AppLocale = 'it'

const catalogs: Record<AppLocale, TranslationKeys> = {
  it,
  en,
}

let activeLocale: AppLocale = DEFAULT_LOCALE

export function setLocale(locale: AppLocale) {
  activeLocale = locale
}

export function getLocale(): AppLocale {
  return activeLocale
}

export function t(): TranslationKeys {
  return catalogs[activeLocale] ?? catalogs.it
}
