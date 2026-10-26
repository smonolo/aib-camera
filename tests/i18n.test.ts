import AsyncStorage from '@react-native-async-storage/async-storage'

import { en } from '@/lib/i18n/en'
import { it as itCatalog } from '@/lib/i18n/it'
import {
  getLocale,
  normalizeLocale,
  resetLocaleForTests,
  setLocale,
  t,
  usesCommaDecimal,
} from '@/lib/i18n'
import {
  hydrateLocale,
  LOCALE_STORAGE_KEY,
  resetLocalePersistForTests,
  setAppLocale,
} from '@/lib/i18n/persist'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

function leafPaths(value: unknown, prefix = ''): string[] {
  if (value == null || typeof value !== 'object') {
    return prefix ? [prefix] : []
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key
      if (typeof child === 'string') return [path]
      return leafPaths(child, path)
    }
  )
}

beforeEach(async () => {
  resetLocaleForTests()
  resetLocalePersistForTests()
  await AsyncStorage.clear()
})

describe('i18n catalogs', () => {
  it('keeps IT and EN leaf keys in sync', () => {
    expect(leafPaths(itCatalog).sort()).toEqual(leafPaths(en).sort())
  })

  it('defaults to Italian copy', () => {
    expect(getLocale()).toBe('it')
    expect(t().tabs.camera).toBe(itCatalog.tabs.camera)
    expect(t().tabs.camera).not.toBe(en.tabs.camera)
    expect(usesCommaDecimal()).toBe(true)
  })

  it('switches to English copy', () => {
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(t().tabs.camera).toBe(en.tabs.camera)
    expect(usesCommaDecimal()).toBe(false)
  })

  it('normalizes unknown locales to Italian', () => {
    expect(normalizeLocale('fr')).toBe('it')
    expect(normalizeLocale(null)).toBe('it')
    expect(normalizeLocale('en')).toBe('en')
  })

  it('persists and hydrates the selected locale', async () => {
    await setAppLocale('en')
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')

    resetLocaleForTests()
    resetLocalePersistForTests()
    expect(getLocale()).toBe('it')

    await hydrateLocale()
    expect(getLocale()).toBe('en')
    expect(t().settings.language).toBe(en.settings.language)
  })

  it('uses non-empty strings for every leaf', () => {
    for (const catalog of [itCatalog, en]) {
      for (const path of leafPaths(catalog)) {
        const parts = path.split('.')
        let cursor: unknown = catalog
        for (const part of parts) {
          cursor = (cursor as Record<string, unknown>)[part]
        }
        expect(typeof cursor).toBe('string')
        expect(String(cursor).trim().length).toBeGreaterThan(0)
      }
    }
  })
})
