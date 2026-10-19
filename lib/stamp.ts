import { t } from './i18n'
import {
  FONT_SIZE_PX,
  type DateTimeFormat,
  type GeoSnapshot,
  type StampSettings,
} from './types'

const ROME_TZ = 'Europe/Rome'
const ADDRESS_MAX_CHARS = 38

export function formatDateTime(date: Date, format: DateTimeFormat): string {
  if (format === 'iso') {
    return date.toLocaleString('sv-SE', { timeZone: ROME_TZ }).replace(' ', 'T')
  }

  if (format === 'it-short') {
    return date.toLocaleString('it-IT', {
      timeZone: ROME_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return date.toLocaleString('it-IT', {
    timeZone: ROME_TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatCoordinates(lat: number, lon: number): string {
  const latHem = lat >= 0 ? 'N' : 'S'
  const lonHem = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}° ${latHem}, ${Math.abs(lon).toFixed(6)}° ${lonHem}`
}

export function formatShortCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
}

export function formatGalleryDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    timeZone: ROME_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function parseCustomLines(
  text: string,
  options?: { max?: number; dropEmpty?: boolean }
): string[] {
  const max = options?.max ?? 4
  const lines = text.split('\n').map(line => line.trimEnd())

  if (options?.dropEmpty) {
    return lines.filter(Boolean).slice(0, max)
  }

  return lines
    .filter((line, index, arr) => !(line === '' && index === arr.length - 1))
    .slice(0, max)
}

function wrapByWords(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

export function wrapAddress(
  address: string,
  maxChars = ADDRESS_MAX_CHARS
): string[] {
  const trimmed = address.trim()
  if (!trimmed) return [t().stamp.noAddress]
  if (trimmed.length <= maxChars) return [trimmed]

  const segments = trimmed.split(/\s*·\s*/)
  if (segments.length > 1) {
    const lines: string[] = []
    let current = ''
    for (const segment of segments) {
      const next = current ? `${current} · ${segment}` : segment
      if (next.length > maxChars && current) {
        lines.push(...wrapByWords(current, maxChars))
        current = segment
      } else {
        current = next
      }
    }
    if (current) lines.push(...wrapByWords(current, maxChars))
    return lines
  }

  return wrapByWords(trimmed, maxChars)
}

export function buildStampLines(
  geo: GeoSnapshot,
  settings: StampSettings
): string[] {
  const lines: string[] = []
  const copy = t()

  if (settings.showDateTime) {
    lines.push(formatDateTime(geo.takenAt, settings.dateTimeFormat))
  }

  if (settings.showCoordinates) {
    if (geo.lat != null && geo.lon != null) {
      lines.push(formatCoordinates(geo.lat, geo.lon))
    } else {
      lines.push(copy.stamp.noCoordinates)
    }
  }

  if (settings.showAddress) {
    lines.push(...wrapAddress(geo.address?.trim() || copy.stamp.noAddress))
  }

  for (const line of settings.customLines) {
    const trimmed = line.trim()
    if (trimmed) lines.push(trimmed)
  }

  return lines
}

export function buildHudLines(geo: GeoSnapshot): string[] {
  const copy = t()
  const lines: string[] = []

  lines.push(formatDateTime(geo.takenAt, 'it-short'))

  if (geo.lat != null && geo.lon != null) {
    lines.push(formatShortCoordinates(geo.lat, geo.lon))
  } else {
    lines.push(copy.camera.acquiringGps)
  }

  if (geo.address?.trim()) {
    lines.push(...wrapAddress(geo.address, 28).slice(0, 2))
  }

  return lines
}

export function stampFontPx(settings: StampSettings): number {
  return FONT_SIZE_PX[settings.fontSize]
}
