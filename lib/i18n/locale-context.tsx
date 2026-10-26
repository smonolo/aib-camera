import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  getLocale,
  subscribeLocale,
  t,
  type AppLocale,
  type TranslationKeys,
} from './index'
import { hydrateLocale, setAppLocale } from './persist'

type LocaleContextValue = {
  locale: AppLocale
  copy: TranslationKeys
  setLocale: (locale: AppLocale) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(getLocale)

  useEffect(() => {
    let active = true
    void hydrateLocale().then(() => {
      if (!active) return
      setLocaleState(getLocale())
    })
    const unsubscribe = subscribeLocale(() => {
      setLocaleState(getLocale())
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const setLocale = useCallback(async (next: AppLocale) => {
    await setAppLocale(next)
  }, [])

  const value = useMemo(
    () => ({
      locale,
      copy: t(),
      setLocale,
    }),
    [locale, setLocale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useI18n must be used within LocaleProvider')
  }
  return ctx
}
