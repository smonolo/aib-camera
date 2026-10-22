import { en } from './en'
import { it } from './it'
import type { TranslationKeys } from './types'

type AppLocale = 'it' | 'en'

const DEFAULT_LOCALE: AppLocale = 'it'

const catalogs: Record<AppLocale, TranslationKeys> = {
  it,
  en,
}

let activeLocale: AppLocale = DEFAULT_LOCALE

export function getLocale(): AppLocale {
  return activeLocale
}

export function usesCommaDecimal(): boolean {
  return getLocale() === 'it'
}

export function t(): TranslationKeys {
  return catalogs[activeLocale] ?? catalogs.it
}
