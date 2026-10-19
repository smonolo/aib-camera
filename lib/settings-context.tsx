import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StampSettings>(
    DEFAULT_STAMP_SETTINGS
  )
  const [ready, setReady] = useState(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

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

  const updateSettings = useCallback(async (patch: Partial<StampSettings>) => {
    const next = normalizeStampSettings({ ...settingsRef.current, ...patch })
    setSettings(next)
    await saveStampSettings(next)
  }, [])

  const value = useMemo(
    () => ({ settings, ready, updateSettings }),
    [settings, ready, updateSettings]
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
