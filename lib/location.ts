import * as Location from 'expo-location'

import type { GeoSnapshot } from './types'

let lastGeocodeKey = ''
let lastGeocodeAddress: string | null = null

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync()
  if (current.granted) return true
  const requested = await Location.requestForegroundPermissionsAsync()
  return requested.granted
}

export function formatAddress(parts: Location.LocationGeocodedAddress): string {
  const streetBits = [parts.street, parts.streetNumber]
    .filter(Boolean)
    .join(' ')
  const localityBits = [parts.district, parts.city, parts.subregion].filter(
    Boolean
  )
  const uniqueLocality = [...new Set(localityBits)]
  const regionBits = [parts.region, parts.postalCode].filter(Boolean).join(' ')
  const name = parts.name && parts.name !== streetBits ? parts.name : null

  return [
    name,
    streetBits,
    uniqueLocality.join(', '),
    regionBits,
    parts.country,
  ]
    .filter(bit => bit && String(bit).trim().length > 0)
    .join(' · ')
}

export async function reverseGeocodeSafe(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
  if (key === lastGeocodeKey) {
    return lastGeocodeAddress
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude })
    const first = results[0]
    const formatted = first ? formatAddress(first) : null
    lastGeocodeKey = key
    lastGeocodeAddress = formatted || null
    return lastGeocodeAddress
  } catch {
    return null
  }
}

export async function captureGeoSnapshot(): Promise<GeoSnapshot> {
  const takenAt = new Date()

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 8000)
      }),
    ]).catch(async () => {
      const last = await Location.getLastKnownPositionAsync()
      if (!last) throw new Error('Posizione non disponibile')
      return last
    })

    const { latitude, longitude, accuracy } = position.coords
    const address = await reverseGeocodeSafe(latitude, longitude)

    return {
      lat: latitude,
      lon: longitude,
      accuracy: accuracy ?? null,
      address,
      takenAt,
    }
  } catch {
    return {
      lat: null,
      lon: null,
      accuracy: null,
      address: null,
      takenAt,
    }
  }
}

export async function watchPosition(
  onUpdate: (
    geo: Pick<GeoSnapshot, 'lat' | 'lon' | 'accuracy' | 'address'>
  ) => void
): Promise<Location.LocationSubscription | null> {
  const granted = await ensureForegroundLocationPermission()
  if (!granted) return null

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 12,
      timeInterval: 5000,
    },
    position => {
      const { latitude, longitude, accuracy } = position.coords
      void reverseGeocodeSafe(latitude, longitude).then(address => {
        onUpdate({
          lat: latitude,
          lon: longitude,
          accuracy: accuracy ?? null,
          address,
        })
      })
    }
  )
}
