import { Platform } from 'react-native'

export function mapsHttpUrl(lat: number, lon: number): string {
  const q = `${lat},${lon}`
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(q)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function mapsGeoUrl(lat: number, lon: number): string {
  return `geo:${lat},${lon}?q=${lat},${lon}`
}

export function mapsOpenUrl(lat: number, lon: number): string {
  return Platform.OS === 'android'
    ? mapsGeoUrl(lat, lon)
    : mapsHttpUrl(lat, lon)
}
