export type DateTimeFormat = 'it-full' | 'it-short' | 'iso'

export type StampFontSize = 'small' | 'medium' | 'large'

export type StampOpacityStep = 0 | 0.25 | 0.5 | 0.75 | 1

export type StampSettings = {
  showDateTime: boolean
  showCoordinates: boolean
  showAddress: boolean
  showAccuracy: boolean
  showAltitude: boolean
  showHeading: boolean
  customLines: string[]
  dateTimeFormat: DateTimeFormat
  fontSize: StampFontSize
  textColor: string
  opacity: StampOpacityStep
}

export type CaptureRecord = {
  id: string
  uri: string
  /** System Photos/MediaStore asset id when saved to the «AIB Camera» album. */
  mediaLibraryAssetId: string | null
  takenAt: string
  lat: number | null
  lon: number | null
  accuracy: number | null
  altitude: number | null
  heading: number | null
  address: string | null
  customText: string[]
  stampConfigSnapshot: StampSettings
}

export type AuditLogEntry = {
  id: string
  takenAt: string
  lat: number | null
  lon: number | null
}

export type GeoSnapshot = {
  lat: number | null
  lon: number | null
  accuracy: number | null
  altitude: number | null
  heading: number | null
  address: string | null
  takenAt: Date
}

export const FONT_SIZE_PX: Record<StampFontSize, number> = {
  small: 16,
  medium: 24,
  large: 32,
}

export const DEFAULT_STAMP_SETTINGS: StampSettings = {
  showDateTime: true,
  showCoordinates: true,
  showAddress: true,
  showAccuracy: true,
  showAltitude: true,
  showHeading: true,
  customLines: ['AIB Camera'],
  dateTimeFormat: 'it-full',
  fontSize: 'medium',
  textColor: '#FFFFFF',
  opacity: 0.5,
}

export function normalizeStampSettings(
  raw: Partial<StampSettings> | null | undefined
): StampSettings {
  const incoming = { ...(raw ?? {}) } as Partial<StampSettings> & {
    corner?: string
    position?: string
  }
  delete incoming.corner
  delete incoming.position

  const base = { ...DEFAULT_STAMP_SETTINGS, ...incoming }

  const legacy = raw as
    { fontSize?: number | StampFontSize; opacity?: number } | undefined
  if (typeof legacy?.fontSize === 'number') {
    if (legacy.fontSize <= 12) base.fontSize = 'small'
    else if (legacy.fontSize >= 17) base.fontSize = 'large'
    else base.fontSize = 'medium'
  }
  if (typeof legacy?.opacity === 'number') {
    const steps: StampOpacityStep[] = [0, 0.25, 0.5, 0.75, 1]
    base.opacity = steps.reduce(
      (best, step) =>
        Math.abs(step - legacy.opacity!) < Math.abs(best - legacy.opacity!)
          ? step
          : best,
      0.75
    )
  }

  base.textColor = '#FFFFFF'
  return base as StampSettings
}
