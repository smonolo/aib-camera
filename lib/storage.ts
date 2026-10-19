import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
  type CaptureRecord,
  type StampSettings,
} from './types'

const SETTINGS_KEY = 'aib-camera.settings.v1'
const CAPTURES_KEY = 'aib-camera.captures.v1'

let capturesCache: CaptureRecord[] | null = null

function sortByTakenAtDesc(captures: CaptureRecord[]): CaptureRecord[] {
  return [...captures].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  )
}

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
  if (capturesCache) return capturesCache

  try {
    const raw = await AsyncStorage.getItem(CAPTURES_KEY)
    if (!raw) {
      capturesCache = []
      return capturesCache
    }
    const parsed = JSON.parse(raw) as CaptureRecord[]
    capturesCache = Array.isArray(parsed) ? sortByTakenAtDesc(parsed) : []
    return capturesCache
  } catch {
    capturesCache = []
    return capturesCache
  }
}

export async function saveCaptures(captures: CaptureRecord[]): Promise<void> {
  capturesCache = sortByTakenAtDesc(captures)
  await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(capturesCache))
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
