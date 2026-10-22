import { en } from '@/lib/i18n/en'
import { it as itCatalog } from '@/lib/i18n/it'
import { getLocale, t } from '@/lib/i18n'

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

describe('i18n catalogs', () => {
  it('keeps IT and EN leaf keys in sync', () => {
    expect(leafPaths(itCatalog).sort()).toEqual(leafPaths(en).sort())
  })

  it('defaults to Italian copy', () => {
    expect(getLocale()).toBe('it')
    expect(t().tabs.camera).toBe(itCatalog.tabs.camera)
    expect(t().tabs.camera).not.toBe(en.tabs.camera)
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
