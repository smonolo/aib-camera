import { en } from './en'
import { it } from './it'
import type { TranslationKeys } from './types'

export type AppLocale = 'it' | 'en'

export const DEFAULT_LOCALE: AppLocale = 'it'

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
]

const catalogs: Record<AppLocale, TranslationKeys> = {
  it,
  en,
}

type LocaleListener = () => void

let activeLocale: AppLocale = DEFAULT_LOCALE
const listeners = new Set<LocaleListener>()

export function normalizeLocale(raw: unknown): AppLocale {
  return raw === 'en' ? 'en' : 'it'
}

export function getLocale(): AppLocale {
  return activeLocale
}

export function setLocale(locale: AppLocale): void {
  const next = normalizeLocale(locale)
  if (next === activeLocale) return
  activeLocale = next
  for (const listener of listeners) listener()
}

export function subscribeLocale(listener: LocaleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usesCommaDecimal(): boolean {
  return getLocale() === 'it'
}

export function t(): TranslationKeys {
  return catalogs[activeLocale] ?? catalogs.it
}

export function resetLocaleForTests(): void {
  activeLocale = DEFAULT_LOCALE
}

export type { TranslationKeys }
