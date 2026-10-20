import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
  type CaptureRecord,
  type StampSettings,
} from './types'

const SETTINGS_KEY = 'aib-camera.settings.v1'
const CAPTURES_KEY = 'aib-camera.captures.v1'
const GEOCODE_CACHE_KEY = 'aib-camera.geocode-cache.v1'

const GEOCODE_CACHE_MAX = 80

export type GeocodeCacheEntry = {
  key: string
  address: string
  lat: number
  lon: number
  savedAt: number
}

let capturesCache: CaptureRecord[] | null = null
let geocodeCacheMemory: GeocodeCacheEntry[] | null = null

function sortByTakenAtDesc(captures: CaptureRecord[]): CaptureRecord[] {
  return [...captures].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  )
}

function normalizeCaptureRecord(raw: CaptureRecord): CaptureRecord {
  return {
    ...raw,
    accuracy: raw.accuracy ?? null,
    altitude: raw.altitude ?? null,
    heading: raw.heading ?? null,
    stampConfigSnapshot: normalizeStampSettings(raw.stampConfigSnapshot),
  }
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
    capturesCache = Array.isArray(parsed)
      ? sortByTakenAtDesc(parsed.map(normalizeCaptureRecord))
      : []
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
  return removeCaptures([id])
}

export async function removeCaptures(ids: string[]): Promise<CaptureRecord[]> {
  if (ids.length === 0) return loadCaptures()
  const remove = new Set(ids)
  const existing = await loadCaptures()
  const next = existing.filter(item => !remove.has(item.id))
  await saveCaptures(next)
  return next
}

export async function getCapture(id: string): Promise<CaptureRecord | null> {
  const existing = await loadCaptures()
  return existing.find(item => item.id === id) ?? null
}

async function loadGeocodeCache(): Promise<GeocodeCacheEntry[]> {
  if (geocodeCacheMemory) return geocodeCacheMemory

  try {
    const raw = await AsyncStorage.getItem(GEOCODE_CACHE_KEY)
    if (!raw) {
      geocodeCacheMemory = []
      return geocodeCacheMemory
    }
    const parsed = JSON.parse(raw) as GeocodeCacheEntry[]
    geocodeCacheMemory = Array.isArray(parsed) ? parsed : []
    return geocodeCacheMemory
  } catch {
    geocodeCacheMemory = []
    return geocodeCacheMemory
  }
}

async function saveGeocodeCache(entries: GeocodeCacheEntry[]): Promise<void> {
  geocodeCacheMemory = entries
  await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(entries))
}

export async function upsertGeocodeCacheEntry(
  entry: Omit<GeocodeCacheEntry, 'savedAt'> & { savedAt?: number }
): Promise<void> {
  const list = await loadGeocodeCache()
  const nextEntry: GeocodeCacheEntry = {
    ...entry,
    savedAt: entry.savedAt ?? Date.now(),
  }
  const without = list.filter(item => item.key !== nextEntry.key)
  const next = [nextEntry, ...without]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, GEOCODE_CACHE_MAX)
  await saveGeocodeCache(next)
}

export async function findNearestGeocodeCache(
  lat: number,
  lon: number,
  maxMeters: number
): Promise<GeocodeCacheEntry | null> {
  const list = await loadGeocodeCache()
  if (list.length === 0) return null

  let best: GeocodeCacheEntry | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const entry of list) {
    const distance = haversineMeters(lat, lon, entry.lat, entry.lon)
    if (distance < bestDistance && distance <= maxMeters) {
      best = entry
      bestDistance = distance
    }
  }

  return best
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earth = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * earth * Math.asin(Math.sqrt(a))
}
