/** Vertical placement only — stamp is always left-aligned to content width. */
export type StampPosition = 'top' | 'bottom'

export type DateTimeFormat = 'it-full' | 'it-short' | 'iso'

export type StampFontSize = 'small' | 'medium' | 'large'

export type StampOpacityStep = 0 | 0.25 | 0.5 | 0.75 | 1

export type StampSettings = {
  showDateTime: boolean
  showCoordinates: boolean
  showAddress: boolean
  customLines: string[]
  dateTimeFormat: DateTimeFormat
  fontSize: StampFontSize
  textColor: string
  opacity: StampOpacityStep
  position: StampPosition
}

export type CaptureRecord = {
  id: string
  uri: string
  takenAt: string
  lat: number | null
  lon: number | null
  accuracy: number | null
  address: string | null
  customText: string[]
  stampConfigSnapshot: StampSettings
}

export type GeoSnapshot = {
  lat: number | null
  lon: number | null
  accuracy: number | null
  address: string | null
  takenAt: Date
}

export const FONT_SIZE_PX: Record<StampFontSize, number> = {
  small: 20,
  medium: 28,
  large: 36,
}

export const DEFAULT_STAMP_SETTINGS: StampSettings = {
  showDateTime: true,
  showCoordinates: true,
  showAddress: true,
  customLines: ['AIB — Protezione Civile'],
  dateTimeFormat: 'it-full',
  fontSize: 'medium',
  textColor: '#FFFFFF',
  opacity: 0.5,
  position: 'bottom',
}

export function normalizeStampSettings(
  raw: Partial<StampSettings> | null | undefined
): StampSettings {
  const incoming = { ...(raw ?? {}) } as Partial<StampSettings> & {
    showAccuracy?: boolean
    corner?: string
  }
  delete incoming.showAccuracy

  // Migrate legacy 4-corner values → top | bottom
  if (incoming.position == null && typeof incoming.corner === 'string') {
    incoming.position = incoming.corner.startsWith('top') ? 'top' : 'bottom'
  }
  delete incoming.corner

  const base = { ...DEFAULT_STAMP_SETTINGS, ...incoming }

  // Migrate legacy numeric fontSize / opacity if present in storage
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

  if (base.position !== 'top' && base.position !== 'bottom') {
    base.position = 'bottom'
  }

  base.textColor = '#FFFFFF'
  return base as StampSettings
}
