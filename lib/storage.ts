import AsyncStorage from '@react-native-async-storage/async-storage'

import { haversineMeters } from './geo-math'
import { resetInstallIdCache } from './install-id'
import { logRejected, warn } from './soft'
import {
  DEFAULT_STAMP_SETTINGS,
  normalizeStampSettings,
  type AuditLogEntry,
  type CaptureRecord,
  type StampSettings,
} from './types'

const SETTINGS_KEY = 'aib-camera.settings.v1'
const CAPTURES_KEY = 'aib-camera.captures.v1'
const AUDIT_LOG_KEY = 'aib-camera.audit-log.v1'
const GEOCODE_CACHE_KEY = 'aib-camera.geocode-cache.v1'
const GEOCODE_CACHE_MAX = 80

type GeocodeCacheEntry = {
  key: string
  address: string
  lat: number
  lon: number
  savedAt: number
}

let capturesCache: CaptureRecord[] | null = null
let auditLogCache: AuditLogEntry[] | null = null
let geocodeCacheMemory: GeocodeCacheEntry[] | null = null

export function resetStorageCaches(): void {
  capturesCache = null
  auditLogCache = null
  geocodeCacheMemory = null
  resetInstallIdCache()
}

function sortByTakenAtDesc<T extends { takenAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  )
}

function normalizeAuditLogEntry(
  raw: Partial<AuditLogEntry>
): AuditLogEntry | null {
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  if (typeof raw.takenAt !== 'string' || !raw.takenAt.trim()) return null
  return {
    id: raw.id,
    takenAt: raw.takenAt,
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lon: typeof raw.lon === 'number' ? raw.lon : null,
  }
}

function normalizeCaptureRecord(
  raw: Partial<CaptureRecord> & Pick<CaptureRecord, 'id' | 'uri' | 'takenAt'>
): CaptureRecord {
  return {
    id: raw.id,
    uri: raw.uri,
    mediaLibraryAssetId:
      typeof raw.mediaLibraryAssetId === 'string' && raw.mediaLibraryAssetId
        ? raw.mediaLibraryAssetId
        : null,
    takenAt: raw.takenAt,
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lon: typeof raw.lon === 'number' ? raw.lon : null,
    accuracy: typeof raw.accuracy === 'number' ? raw.accuracy : null,
    altitude: typeof raw.altitude === 'number' ? raw.altitude : null,
    heading: typeof raw.heading === 'number' ? raw.heading : null,
    address: typeof raw.address === 'string' ? raw.address : null,
    customText: Array.isArray(raw.customText)
      ? raw.customText.filter(
          (line): line is string => typeof line === 'string'
        )
      : [],
    stampConfigSnapshot: normalizeStampSettings(raw.stampConfigSnapshot),
  }
}

async function readJsonArray(key: string): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
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
  try {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(normalizeStampSettings(settings))
    )
  } catch (error) {
    warn('Stamp settings save failed', error)
  }
}

export async function loadCaptures(): Promise<CaptureRecord[]> {
  if (capturesCache) return capturesCache

  const parsed = await readJsonArray(CAPTURES_KEY)
  capturesCache =
    parsed == null
      ? []
      : sortByTakenAtDesc(
          (parsed as CaptureRecord[]).map(normalizeCaptureRecord)
        )
  return capturesCache
}

async function saveCaptures(captures: CaptureRecord[]): Promise<void> {
  capturesCache = sortByTakenAtDesc(captures)
  try {
    await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(capturesCache))
  } catch (error) {
    warn('Captures save failed', error)
  }
}

export async function addCapture(
  record: CaptureRecord
): Promise<CaptureRecord[]> {
  const existing = await loadCaptures()
  const next = [record, ...existing]
  await saveCaptures(next)
  return next
}

export async function removeCaptures(ids: string[]): Promise<CaptureRecord[]> {
  if (ids.length === 0) return loadCaptures()
  const remove = new Set(ids)
  const existing = await loadCaptures()
  const next = existing.filter(item => !remove.has(item.id))
  await saveCaptures(next)
  return next
}

export async function setCaptureMediaAssetId(
  id: string,
  mediaLibraryAssetId: string
): Promise<CaptureRecord | null> {
  const existing = await loadCaptures()
  const index = existing.findIndex(item => item.id === id)
  if (index < 0) return null

  const current = existing[index]!
  const nextRecord: CaptureRecord = {
    ...current,
    mediaLibraryAssetId,
  }
  const next = [...existing]
  next[index] = nextRecord
  await saveCaptures(next)
  return nextRecord
}

export async function getCapture(id: string): Promise<CaptureRecord | null> {
  const existing = await loadCaptures()
  return existing.find(item => item.id === id) ?? null
}

export async function getLatestCapture(): Promise<CaptureRecord | null> {
  const existing = await loadCaptures()
  return existing[0] ?? null
}

export async function loadAuditLog(): Promise<AuditLogEntry[]> {
  if (auditLogCache) return auditLogCache

  const parsed = await readJsonArray(AUDIT_LOG_KEY)
  auditLogCache =
    parsed == null
      ? []
      : sortByTakenAtDesc(
          (parsed as Partial<AuditLogEntry>[])
            .map(normalizeAuditLogEntry)
            .filter((entry): entry is AuditLogEntry => entry != null)
        )
  return auditLogCache
}

async function saveAuditLog(entries: AuditLogEntry[]): Promise<void> {
  auditLogCache = sortByTakenAtDesc(entries)
  try {
    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLogCache))
  } catch (error) {
    warn('Audit log save failed', error)
  }
}

export async function appendAuditLogEntry(
  entry: AuditLogEntry
): Promise<AuditLogEntry[]> {
  const existing = await loadAuditLog()
  if (existing.some(item => item.id === entry.id)) return existing
  const next = [entry, ...existing]
  await saveAuditLog(next)
  return next
}

export async function recordCapture(record: CaptureRecord): Promise<void> {
  logRejected(
    'recordCapture step failed',
    await Promise.allSettled([
      appendAuditLogEntry({
        id: record.id,
        takenAt: record.takenAt,
        lat: record.lat,
        lon: record.lon,
      }),
      addCapture(record),
    ])
  )
}

async function loadGeocodeCache(): Promise<GeocodeCacheEntry[]> {
  if (geocodeCacheMemory) return geocodeCacheMemory

  const parsed = await readJsonArray(GEOCODE_CACHE_KEY)
  geocodeCacheMemory = parsed == null ? [] : (parsed as GeocodeCacheEntry[])
  return geocodeCacheMemory
}

async function saveGeocodeCache(entries: GeocodeCacheEntry[]): Promise<void> {
  geocodeCacheMemory = entries
  try {
    await AsyncStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(entries))
  } catch (error) {
    warn('Geocode cache save failed', error)
  }
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
