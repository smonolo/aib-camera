import * as Location from 'expo-location'

import { findNearestGeocodeCache, upsertGeocodeCacheEntry } from './storage'
import type { GeoSnapshot } from './types'

const GEOCODE_CELL_DECIMALS = 3
const GEOCODE_CACHE_RADIUS_M = 2500
const GEOCODE_TIMEOUT_MS = 2000
const CAPTURE_POSITION_TIMEOUT_MS = 2000
const HEADING_TIMEOUT_MS = 800

let lastGeocodeKey = ''
let lastGeocodeAddress: string | null = null

function emptySnapshot(
  takenAt: Date,
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

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms)
    }),
  ])
}

async function hasForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync()
  return current.granted
}

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const requested = await Location.requestForegroundPermissionsAsync()
  return requested.granted
}

function geocodeCellKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(GEOCODE_CELL_DECIMALS)},${longitude.toFixed(GEOCODE_CELL_DECIMALS)}`
}

/** Locality-first place label for forest / AIB ops (no country). */
function formatAddress(parts: Location.LocationGeocodedAddress): string {
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

function headingFromLocationHeading(
  heading: Location.LocationHeadingObject
): number | null {
  if (heading.trueHeading >= 0) {
    return normalizeHeadingDegrees(heading.trueHeading)
  }
  if (heading.magHeading >= 0) {
    return normalizeHeadingDegrees(heading.magHeading)
  }
  return null
}

function normalizeHeadingDegrees(value: number): number {
  const wrapped = ((value % 360) + 360) % 360
  return Math.round(wrapped)
}

async function reverseGeocodeSafe(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const key = geocodeCellKey(latitude, longitude)
  if (key === lastGeocodeKey) {
    return lastGeocodeAddress
  }

  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      GEOCODE_TIMEOUT_MS,
      'geocode-timeout'
    )
    const first = results[0]
    const formatted = first ? formatAddress(first) : null
    if (formatted) {
      lastGeocodeKey = key
      lastGeocodeAddress = formatted
      void upsertGeocodeCacheEntry({
        key,
        address: formatted,
        lat: latitude,
        lon: longitude,
      })
      return formatted
    }
  } catch {
    // Fall through to persistent cache below.
  }

  try {
    const cached = await findNearestGeocodeCache(
      latitude,
      longitude,
      GEOCODE_CACHE_RADIUS_M
    )
    if (cached) {
      lastGeocodeKey = key
      lastGeocodeAddress = cached.address
      return cached.address
    }
  } catch {
    // Ignore cache read failures.
  }

  lastGeocodeKey = key
  lastGeocodeAddress = null
  return null
}

type CaptureGeoOptions = {
  headingHint?: number | null
  /** Max wait for a fresh GPS fix. Keep short on the shutter path. */
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
    return emptySnapshot(takenAt, headingHint)
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
    return emptySnapshot(takenAt, headingHint)
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
      onUpdate(headingFromLocationHeading(heading))
    })
  } catch {
    return null
  }
}
