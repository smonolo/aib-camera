import type { ExifTags } from '@lodev09/react-native-exify'
import { TurboModuleRegistry } from 'react-native'

import { APP_NAME, appVersionLabel } from './config'
import { warn } from './soft'
import { formatExifDateTime, ROME_TZ } from './time'
import type { GeoSnapshot } from './types'

type ExifyModule = typeof import('@lodev09/react-native-exify')

let exifyCache: ExifyModule | null | undefined

function loadExify(): ExifyModule | null {
  if (exifyCache !== undefined) return exifyCache
  if (TurboModuleRegistry.get('Exify') == null) {
    exifyCache = null
    return null
  }
  try {
    exifyCache = require('@lodev09/react-native-exify') as ExifyModule
  } catch (error) {
    warn('EXIF native module unavailable', error)
    exifyCache = null
  }
  return exifyCache
}

type CaptureExifOptions = {
  captureId: string
  customLines?: string[]
}

export function buildCaptureExifTags(
  geo: GeoSnapshot,
  options: CaptureExifOptions
): ExifTags {
  const version = appVersionLabel()
  const software = `${APP_NAME} ${version}`
  const dateTime = formatExifDateTime(geo.takenAt, ROME_TZ)
  const customLines = (options.customLines ?? [])
    .map(line => line.trim())
    .filter(Boolean)
  const address = geo.address?.trim() || null
  const hasGps = geo.lat != null && geo.lon != null

  const descriptionParts = [`Taken with ${software}`, `id ${options.captureId}`]
  if (hasGps) {
    descriptionParts.push(`${geo.lat!.toFixed(6)}, ${geo.lon!.toFixed(6)}`)
  }
  if (address) descriptionParts.push(address)
  if (customLines.length > 0) descriptionParts.push(customLines.join(' / '))

  const machinePayload: Record<string, unknown> = {
    app: APP_NAME,
    version,
    id: options.captureId,
    taken_at: geo.takenAt.toISOString(),
    timezone: ROME_TZ,
  }
  if (geo.lat != null) machinePayload.lat = geo.lat
  if (geo.lon != null) machinePayload.lon = geo.lon
  if (geo.accuracy != null) machinePayload.accuracy_m = geo.accuracy
  if (geo.altitude != null) machinePayload.altitude_m = geo.altitude
  if (geo.heading != null) machinePayload.heading_deg = geo.heading
  if (address) machinePayload.address = address
  if (customLines.length > 0) machinePayload.custom = customLines

  const tags: ExifTags = {
    Software: software,
    Artist: APP_NAME,
    ImageUniqueID: options.captureId,
    ImageDescription: descriptionParts.join(' · '),
    UserComment: JSON.stringify(machinePayload),
    DateTime: dateTime,
    DateTimeOriginal: dateTime,
    DateTimeDigitized: dateTime,
  }

  if (hasGps) {
    tags.GPSLatitude = geo.lat!
    tags.GPSLongitude = geo.lon!
    tags.GPSProcessingMethod = APP_NAME
    const utcStamp = formatExifDateTime(geo.takenAt, 'UTC')
    tags.GPSDateStamp = utcStamp.slice(0, 10)
    tags.GPSTimeStamp = utcStamp.slice(11)
  }

  if (geo.altitude != null && Number.isFinite(geo.altitude)) {
    tags.GPSAltitude = Math.abs(geo.altitude)
    tags.GPSAltitudeRef = geo.altitude < 0 ? 1 : 0
  }

  if (geo.heading != null && Number.isFinite(geo.heading)) {
    tags.GPSImgDirection = ((geo.heading % 360) + 360) % 360
    tags.GPSImgDirectionRef = 'T'
  }

  if (geo.accuracy != null && Number.isFinite(geo.accuracy)) {
    tags.GPSHPositioningError = geo.accuracy
  }

  return tags
}

export async function writeCaptureExif(
  uri: string,
  geo: GeoSnapshot,
  options: CaptureExifOptions
): Promise<boolean> {
  const Exify = loadExify()
  if (!Exify) return false

  try {
    await Exify.write(uri, buildCaptureExifTags(geo, options))
    return true
  } catch (error) {
    warn('EXIF write failed', error)
    return false
  }
}
