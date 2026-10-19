import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { loadStampSettings, saveStampSettings } from './storage'
import {
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
  type StampSettings,
} from './types'

type SettingsContextValue = {
  settings: StampSettings
  ready: boolean
  updateSettings: (patch: Partial<StampSettings>) => Promise<void>
  replaceSettings: (next: StampSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StampSettings>(
    DEFAULT_STAMP_SETTINGS
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    loadStampSettings().then(loaded => {
      if (!active) return
      setSettings(normalizeStampSettings(loaded))
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  const replaceSettings = useCallback(async (next: StampSettings) => {
    const normalized = normalizeStampSettings(next)
    setSettings(normalized)
    await saveStampSettings(normalized)
  }, [])

  const updateSettings = useCallback(
    async (patch: Partial<StampSettings>) => {
      const next = normalizeStampSettings({ ...settings, ...patch })
      setSettings(next)
      await saveStampSettings(next)
    },
    [settings]
  )

  const value = useMemo(
    () => ({ settings, ready, updateSettings, replaceSettings }),
    [settings, ready, updateSettings, replaceSettings]
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useStampSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useStampSettings must be used within SettingsProvider')
  }
  return ctx
}
