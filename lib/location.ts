import * as Location from 'expo-location'

import { haversineMeters } from './geo-math'
import { softTry } from './soft'
import { findNearestGeocodeCache, upsertGeocodeCacheEntry } from './storage'
import type { GeoSnapshot } from './types'

const GEOCODE_CELL_DECIMALS = 3
const GEOCODE_CACHE_RADIUS_M = 2500
const GEOCODE_REFRESH_MIN_M = 600
const GEOCODE_TIMEOUT_MS = 2000
const CAPTURE_POSITION_TIMEOUT_MS = 2000
const HEADING_TIMEOUT_MS = 800
const MIN_HEADING_ACCURACY = 1
const HEADING_SMOOTH_ALPHA = 0.28

let lastGeocodeKey = ''
let lastGeocodeAddress: string | null = null
let lastGeocodeLat: number | null = null
let lastGeocodeLon: number | null = null
let smoothedHeading: number | null = null

export function resetGeocodeMemory(): void {
  lastGeocodeKey = ''
  lastGeocodeAddress = null
  lastGeocodeLat = null
  lastGeocodeLon = null
  smoothedHeading = null
}

function rememberGeocode(
  key: string,
  address: string | null,
  latitude: number,
  longitude: number
): void {
  lastGeocodeKey = key
  lastGeocodeAddress = address
  lastGeocodeLat = latitude
  lastGeocodeLon = longitude
}

function stickyGeocodeAddress(
  latitude: number,
  longitude: number
): string | null | undefined {
  if (
    lastGeocodeLat == null ||
    lastGeocodeLon == null ||
    lastGeocodeAddress == null
  ) {
    return undefined
  }
  const moved = haversineMeters(
    latitude,
    longitude,
    lastGeocodeLat,
    lastGeocodeLon
  )
  if (moved < GEOCODE_REFRESH_MIN_M) {
    return lastGeocodeAddress
  }
  return undefined
}

export function emptyGeoSnapshot(
  takenAt: Date = new Date(),
  heading: number | null = null
): GeoSnapshot {
  return {
    lat: null,
    lon: null,
    accuracy: null,
    altitude: null,
    heading,
    address: null,
    takenAt,
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'timeout'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function hasForegroundLocationPermission(): Promise<boolean> {
  return softTry(
    'Location permission check failed',
    async () => (await Location.getForegroundPermissionsAsync()).granted,
    false
  )
}

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  return softTry(
    'Location permission request failed',
    async () => {
      const current = await Location.getForegroundPermissionsAsync()
      if (current.granted) return true
      if (!current.canAskAgain) return false
      return (await Location.requestForegroundPermissionsAsync()).granted
    },
    false
  )
}

export function geocodeCellKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(GEOCODE_CELL_DECIMALS)},${longitude.toFixed(GEOCODE_CELL_DECIMALS)}`
}

export function formatGeocodeAddress(
  parts: Location.LocationGeocodedAddress
): string {
  const streetBits = [parts.street, parts.streetNumber]
    .filter(Boolean)
    .join(' ')
  const name =
    parts.name && parts.name !== streetBits && parts.name !== parts.street
      ? parts.name
      : null

  const localityBits = [parts.district, parts.city, parts.subregion].filter(
    Boolean
  )
  const uniqueLocality = [...new Set(localityBits.map(bit => String(bit)))]

  const bits: string[] = []
  if (name && !uniqueLocality.includes(name)) bits.push(name)
  bits.push(...uniqueLocality)

  if (streetBits) bits.push(streetBits)

  if (parts.region && !uniqueLocality.includes(parts.region)) {
    bits.push(parts.region)
  }

  return bits.filter(bit => bit && String(bit).trim().length > 0).join(' · ')
}

export function headingFromLocationHeading(
  heading: Location.LocationHeadingObject
): number | null {
  if (
    typeof heading.accuracy === 'number' &&
    heading.accuracy < MIN_HEADING_ACCURACY
  ) {
    return null
  }
  if (heading.trueHeading >= 0) {
    return normalizeHeadingDegrees(heading.trueHeading)
  }
  if (heading.magHeading >= 0) {
    return normalizeHeadingDegrees(heading.magHeading)
  }
  return null
}

export function normalizeHeadingDegrees(value: number): number {
  const wrapped = ((value % 360) + 360) % 360
  return Math.round(wrapped)
}

export function smoothHeadingDegrees(
  next: number,
  previous: number | null,
  alpha = HEADING_SMOOTH_ALPHA
): number {
  const target = ((next % 360) + 360) % 360
  if (previous == null || !Number.isFinite(previous)) {
    return normalizeHeadingDegrees(target)
  }
  const delta = ((target - previous + 540) % 360) - 180
  return normalizeHeadingDegrees(previous + alpha * delta)
}

export function updateSmoothedHeading(
  heading: Location.LocationHeadingObject
): number | null {
  const sample = headingFromLocationHeading(heading)
  if (sample == null) {
    return smoothedHeading
  }
  smoothedHeading = smoothHeadingDegrees(sample, smoothedHeading)
  return smoothedHeading
}

export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<string | null> {
  return reverseGeocodeSafe(latitude, longitude)
}

async function reverseGeocodeSafe(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const key = geocodeCellKey(latitude, longitude)
  if (key === lastGeocodeKey) {
    return lastGeocodeAddress
  }

  const sticky = stickyGeocodeAddress(latitude, longitude)
  if (sticky !== undefined) {
    lastGeocodeKey = key
    return sticky
  }

  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      GEOCODE_TIMEOUT_MS,
      'geocode-timeout'
    )
    const first = results[0]
    const formatted = first ? formatGeocodeAddress(first) : null
    if (formatted) {
      rememberGeocode(key, formatted, latitude, longitude)
      void upsertGeocodeCacheEntry({
        key,
        address: formatted,
        lat: latitude,
        lon: longitude,
      })
      return formatted
    }
  } catch {}

  try {
    const cached = await findNearestGeocodeCache(
      latitude,
      longitude,
      GEOCODE_CACHE_RADIUS_M
    )
    if (cached) {
      rememberGeocode(key, cached.address, latitude, longitude)
      return cached.address
    }
  } catch {}

  rememberGeocode(key, null, latitude, longitude)
  return null
}

type CaptureGeoOptions = {
  headingHint?: number | null
  positionTimeoutMs?: number
}

export async function captureGeoSnapshot(
  headingHintOrOptions?: number | null | CaptureGeoOptions
): Promise<GeoSnapshot> {
  const options: CaptureGeoOptions =
    headingHintOrOptions != null && typeof headingHintOrOptions === 'object'
      ? headingHintOrOptions
      : { headingHint: headingHintOrOptions ?? null }

  const takenAt = new Date()
  const headingHint = options.headingHint ?? null
  const positionTimeoutMs =
    options.positionTimeoutMs ?? CAPTURE_POSITION_TIMEOUT_MS

  const granted = await hasForegroundLocationPermission()
  if (!granted) {
    return emptyGeoSnapshot(takenAt, headingHint)
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      positionTimeoutMs,
      'position-timeout'
    ).catch(async () => {
      const last = await Location.getLastKnownPositionAsync()
      if (!last) throw new Error('Posizione non disponibile')
      return last
    })

    const { latitude, longitude, accuracy, altitude } = position.coords
    const address = await reverseGeocodeSafe(latitude, longitude)

    let heading = headingHint
    if (heading == null) {
      try {
        const headingSample = await withTimeout(
          Location.getHeadingAsync(),
          HEADING_TIMEOUT_MS,
          'heading-timeout'
        )
        heading = headingFromLocationHeading(headingSample)
      } catch {
        heading = null
      }
    }

    return {
      lat: latitude,
      lon: longitude,
      accuracy: accuracy ?? null,
      altitude: altitude ?? null,
      heading,
      address,
      takenAt,
    }
  } catch {
    return emptyGeoSnapshot(takenAt, headingHint)
  }
}

export async function watchPosition(
  onUpdate: (
    geo: Pick<GeoSnapshot, 'lat' | 'lon' | 'accuracy' | 'altitude' | 'address'>
  ) => void
): Promise<Location.LocationSubscription | null> {
  const granted = await hasForegroundLocationPermission()
  if (!granted) return null

  try {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 12,
        timeInterval: 5000,
      },
      position => {
        const { latitude, longitude, accuracy, altitude } = position.coords
        onUpdate({
          lat: latitude,
          lon: longitude,
          accuracy: accuracy ?? null,
          altitude: altitude ?? null,
          address: lastGeocodeAddress,
        })
        void reverseGeocodeSafe(latitude, longitude).then(address => {
          onUpdate({
            lat: latitude,
            lon: longitude,
            accuracy: accuracy ?? null,
            altitude: altitude ?? null,
            address,
          })
        })
      }
    )
  } catch {
    return null
  }
}

export async function watchHeading(
  onUpdate: (heading: number | null) => void
): Promise<Location.LocationSubscription | null> {
  const granted = await hasForegroundLocationPermission()
  if (!granted) return null

  try {
    return await Location.watchHeadingAsync(heading => {
      onUpdate(updateSmoothedHeading(heading))
    })
  } catch {
    return null
  }
}
