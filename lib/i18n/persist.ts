import AsyncStorage from '@react-native-async-storage/async-storage'

import { softTry, softVoid } from '../soft'
import { normalizeLocale, setLocale, type AppLocale } from './index'

export const LOCALE_STORAGE_KEY = 'aib-camera.locale.v1'

let hydrated = false
let hydratePromise: Promise<void> | null = null

async function persistLocale(locale: AppLocale): Promise<void> {
  await softVoid('Locale persist failed', () =>
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale)
  )
}

export async function hydrateLocale(): Promise<void> {
  if (hydrated) return
  if (hydratePromise) return hydratePromise

  hydratePromise = (async () => {
    const loaded = await softTry(
      'Locale load failed',
      async () => AsyncStorage.getItem(LOCALE_STORAGE_KEY),
      null
    )
    if (loaded != null) setLocale(normalizeLocale(loaded))
    hydrated = true
  })()

  try {
    await hydratePromise
  } finally {
    hydratePromise = null
  }
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  const next = normalizeLocale(locale)
  setLocale(next)
  await persistLocale(next)
}

export function resetLocalePersistForTests(): void {
  hydrated = false
  hydratePromise = null
}
