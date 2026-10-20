import { Platform } from 'react-native'

type ZoomKind = 'ultraWide' | 'wide' | 'tele'

export type ZoomOption = {
  key: string
  kind: ZoomKind
  factor: number
  lens?: string
  zoom: number
}

const ASSUMED_DEVICE_MAX_ZOOM = 125

function formatZoomFactor(factor: number, useComma: boolean): string {
  if (factor === 0.5) return useComma ? '0,5' : '0.5'
  if (Number.isInteger(factor)) return String(factor)
  return useComma ? String(factor).replace('.', ',') : String(factor)
}

export function formatZoomLabel(
  factor: number,
  useComma: boolean,
  active: boolean
): string {
  const base = formatZoomFactor(factor, useComma)
  return active ? `${base}×` : base
}

function normalizedZoomForFactor(
  factor: number,
  assumedMax = ASSUMED_DEVICE_MAX_ZOOM
): number {
  if (factor <= 1) return 0
  return Math.min(1, Math.log(factor) / Math.log(assumedMax))
}

function classifyLensName(name: string): ZoomKind | null {
  const n = name.toLowerCase()

  if (
    /dual|doppia|triple|tripla|lidar|truedepth|true\s*depth|continuum|multi|virtual|profondit/.test(
      n
    )
  ) {
    return null
  }

  if (
    /ultra\s*-?\s*wide|ultrawide|ultra\s*grandangolare|grandangolo\s*ultra|ultra\s*weit|super\s*wide/.test(
      n
    )
  ) {
    return 'ultraWide'
  }

  if (/telephoto|teleobiettivo|t[eé]l[eé]objectif|\btele\b/.test(n)) {
    return 'tele'
  }

  if (
    /wide\s*angle|grandangolare|weitwinkel|wide|fotocamera|camera|arri[eè]re|back|rear|posteriore/.test(
      n
    )
  ) {
    return 'wide'
  }

  return null
}

export function buildIosZoomOptions(lenses: string[]): ZoomOption[] {
  const byKind = new Map<ZoomKind, string>()

  for (const lens of lenses) {
    const kind = classifyLensName(lens)
    if (!kind || byKind.has(kind)) continue
    byKind.set(kind, lens)
  }

  const options: ZoomOption[] = []

  const ultra = byKind.get('ultraWide')
  if (ultra) {
    options.push({
      key: 'ultraWide',
      kind: 'ultraWide',
      factor: 0.5,
      lens: ultra,
      zoom: 0,
    })
  }

  const wide = byKind.get('wide')
  if (wide) {
    options.push({
      key: 'wide',
      kind: 'wide',
      factor: 1,
      lens: wide,
      zoom: 0,
    })
  }

  const tele = byKind.get('tele')
  if (tele) {
    options.push({
      key: 'tele',
      kind: 'tele',
      factor: 2,
      lens: tele,
      zoom: 0,
    })
  } else if (wide) {
    options.push({
      key: 'tele-digital',
      kind: 'tele',
      factor: 2,
      lens: wide,
      zoom: normalizedZoomForFactor(2),
    })
  }

  return options
}

export function defaultZoomOptions(): ZoomOption[] {
  if (Platform.OS === 'ios') return []
  return [
    { key: 'wide', kind: 'wide', factor: 1, zoom: 0 },
    {
      key: 'tele-digital',
      kind: 'tele',
      factor: 2,
      zoom: normalizedZoomForFactor(2),
    },
  ]
}

export function pickDefaultOption(options: ZoomOption[]): ZoomOption | null {
  if (options.length === 0) return null
  return options.find(option => option.kind === 'wide') ?? options[0]
}
