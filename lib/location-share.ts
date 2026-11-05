import { Platform, Share } from 'react-native'

import { warn } from './soft'

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

export function buildLocationShareMessage(
  infoText: string,
  lat: number | null,
  lon: number | null
): string {
  if (lat == null || lon == null) return infoText
  const link = mapsHttpUrl(lat, lon)
  if (!infoText.trim()) return link
  return `${infoText}\n\n${link}`
}

export async function shareLocationText(
  message: string,
  dialogTitle: string
): Promise<void> {
  try {
    await Share.share({ message, title: dialogTitle })
  } catch (error) {
    warn('Share location failed', error)
    throw error
  }
}
