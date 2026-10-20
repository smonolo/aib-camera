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

export function formatAccuracy(meters: number): string {
  const rounded =
    meters < 10 ? Math.round(meters * 10) / 10 : Math.round(meters)
  return `±${rounded} m`
}

export function formatAltitude(meters: number): string {
  return `${Math.round(meters)} m s.l.m.`
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function formatHeading(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return `${Math.round(normalized)}° ${CARDINALS[index]}`
}

export function buildMetaStampLine(
  geo: GeoSnapshot,
  settings: StampSettings
): string | null {
  const parts: string[] = []

  if (settings.showAccuracy && geo.accuracy != null) {
    parts.push(formatAccuracy(geo.accuracy))
  }
  if (settings.showAltitude && geo.altitude != null) {
    parts.push(formatAltitude(geo.altitude))
  }
  if (settings.showHeading && geo.heading != null) {
    parts.push(formatHeading(geo.heading))
  }

  return parts.length > 0 ? parts.join(' · ') : null
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

/** Calendar day key in Europe/Rome (`YYYY-MM-DD`) for grouping gallery sections. */
export function galleryDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: ROME_TZ })
}

export function formatGalleryDayLabel(
  dayKey: string,
  labels: { today: string; yesterday: string },
  locale: 'it' | 'en'
): string {
  const todayKey = galleryDayKey(new Date().toISOString())
  if (dayKey === todayKey) return labels.today

  const yesterdayKey = shiftDayKey(todayKey, -1)
  if (dayKey === yesterdayKey) return labels.yesterday

  // Noon UTC avoids DST edge cases when formatting a calendar day key.
  const date = new Date(`${dayKey}T12:00:00.000Z`)
  return date.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function shiftDayKey(dayKey: string, deltaDays: number): string {
  const date = new Date(`${dayKey}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
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

function breakLongToken(token: string, maxChars: number): string[] {
  if (token.length <= maxChars) return [token]
  const chunks: string[] = []
  for (let i = 0; i < token.length; i += maxChars) {
    chunks.push(token.slice(i, i + maxChars))
  }
  return chunks
}

export function wrapByWords(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
      current = ''
    }

    if (word.length <= maxChars) {
      current = word
      continue
    }

    const chunks = breakLongToken(word, maxChars)
    lines.push(...chunks.slice(0, -1))
    current = chunks[chunks.length - 1] ?? ''
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : [text]
}

export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  measure: (value: string) => number
): string[] {
  if (maxWidth <= 0) return [text]
  if (measure(text) <= maxWidth) return [text]

  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  const pushOverflowWord = (word: string) => {
    let chunk = ''
    for (const char of word) {
      const next = chunk + char
      if (measure(next) <= maxWidth || chunk.length === 0) {
        chunk = next
      } else {
        lines.push(chunk)
        chunk = char
      }
    }
    current = chunk
  }

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (measure(next) <= maxWidth) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
      current = ''
    }

    if (measure(word) <= maxWidth) {
      current = word
    } else {
      pushOverflowWord(word)
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : [text]
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

export function buildInfoStampLines(
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

  const meta = buildMetaStampLine(geo, settings)
  if (meta) lines.push(meta)

  if (settings.showAddress) {
    lines.push(...wrapAddress(geo.address?.trim() || copy.stamp.noAddress))
  }

  return lines
}

export function buildCustomStampLines(settings: StampSettings): string[] {
  const lines: string[] = []
  for (const line of settings.customLines) {
    const trimmed = line.trim()
    if (trimmed) lines.push(...wrapByWords(trimmed, ADDRESS_MAX_CHARS))
  }
  return lines
}

export function buildHudLines(
  geo: GeoSnapshot,
  options?: { addressMaxChars?: number }
): string[] {
  const copy = t()
  const lines: string[] = []
  const addressMaxChars = options?.addressMaxChars ?? 36

  lines.push(formatDateTime(geo.takenAt, 'it-short'))

  if (geo.lat != null && geo.lon != null) {
    lines.push(formatShortCoordinates(geo.lat, geo.lon))
  } else {
    lines.push(copy.camera.acquiringGps)
  }

  const metaParts: string[] = []
  if (geo.accuracy != null) metaParts.push(formatAccuracy(geo.accuracy))
  if (geo.altitude != null) metaParts.push(`${Math.round(geo.altitude)} m`)
  if (geo.heading != null) metaParts.push(formatHeading(geo.heading))
  if (metaParts.length > 0) lines.push(metaParts.join(' · '))

  if (geo.address?.trim()) {
    lines.push(...wrapAddress(geo.address, addressMaxChars).slice(0, 3))
  }

  return lines
}

export function stampFontPx(settings: StampSettings): number {
  return FONT_SIZE_PX[settings.fontSize]
}
