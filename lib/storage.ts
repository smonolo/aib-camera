import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
  type CaptureRecord,
  type StampSettings,
} from './types'

const SETTINGS_KEY = 'aib-camera.settings.v1'
const CAPTURES_KEY = 'aib-camera.captures.v1'

export async function loadStampSettings(): Promise<StampSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_STAMP_SETTINGS
    return normalizeStampSettings(JSON.parse(raw) as Partial<StampSettings>)
  } catch {
    return DEFAULT_STAMP_SETTINGS
  }
}

export async function saveStampSettings(
  settings: StampSettings
): Promise<void> {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(normalizeStampSettings(settings))
  )
}

export async function loadCaptures(): Promise<CaptureRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(CAPTURES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CaptureRecord[]
    if (!Array.isArray(parsed)) return []
    return [...parsed].sort(
      (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
    )
  } catch {
    return []
  }
}

export async function saveCaptures(captures: CaptureRecord[]): Promise<void> {
  await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(captures))
}

export async function addCapture(
  record: CaptureRecord
): Promise<CaptureRecord[]> {
  const existing = await loadCaptures()
  const next = [record, ...existing]
  await saveCaptures(next)
  return next
}

export async function removeCapture(id: string): Promise<CaptureRecord[]> {
  const existing = await loadCaptures()
  const next = existing.filter(item => item.id !== id)
  await saveCaptures(next)
  return next
}

export async function getCapture(id: string): Promise<CaptureRecord | null> {
  const existing = await loadCaptures()
  return existing.find(item => item.id === id) ?? null
}
