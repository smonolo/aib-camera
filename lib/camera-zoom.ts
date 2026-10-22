import { Platform } from 'react-native'

type ZoomKind = 'ultraWide' | 'wide' | 'tele'

export type ZoomOption = {
  key: string
  kind: ZoomKind
  factor: number
  lens?: string
  zoom: number
}

export type ResolvedZoom = {
  option: ZoomOption
  zoom: number
  factor: number
}

const ASSUMED_DEVICE_MAX_ZOOM = 125

/** Soft cap for freeform pinch beyond the top discrete chip. */
const PINCH_MAX_FACTOR_MULTIPLIER = 4
const PINCH_MAX_FACTOR_FLOOR = 8

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

/** Live pinch readout, e.g. `8,2×` / `8.2×`. */
export function formatLiveZoomFactor(
  factor: number,
  useComma: boolean
): string {
  if (!Number.isFinite(factor) || factor <= 0) {
    return formatZoomLabel(1, useComma, true)
  }

  const rounded = Math.round(factor * 10) / 10
  if (Math.abs(rounded - 0.5) < 0.05) {
    return formatZoomLabel(0.5, useComma, true)
  }
  if (Number.isInteger(rounded)) {
    return formatZoomLabel(rounded, useComma, true)
  }

  const text = useComma
    ? rounded.toFixed(1).replace('.', ',')
    : rounded.toFixed(1)
  return `${text}×`
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

/** CameraView zoom is a 0–1 fraction of the device max zoom. */
export function clampCameraZoom(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Optical / labeled base for an option (what CameraView zoom=0 shows).
 * Digital tele keeps the wide lens base of 1×.
 */
export function lensBaseFactor(option: ZoomOption): number {
  if (option.kind === 'ultraWide') return 0.5
  if (option.key === 'tele-digital') return 1
  if (option.kind === 'tele') return 2
  return 1
}

export function factorFromCameraZoom(
  baseFactor: number,
  zoom: number,
  assumedMax = ASSUMED_DEVICE_MAX_ZOOM
): number {
  if (zoom <= 0) return baseFactor
  return baseFactor * assumedMax ** zoom
}

export function cameraZoomFromFactor(
  baseFactor: number,
  absoluteFactor: number,
  assumedMax = ASSUMED_DEVICE_MAX_ZOOM
): number {
  if (absoluteFactor <= baseFactor) return 0
  return clampCameraZoom(
    Math.log(absoluteFactor / baseFactor) / Math.log(assumedMax)
  )
}

export function pinchFactorRange(options: ZoomOption[]): {
  min: number
  max: number
} {
  if (options.length === 0) return { min: 1, max: 1 }
  const sorted = [...options].sort((a, b) => a.factor - b.factor)
  const min = sorted[0]!.factor
  const top = sorted[sorted.length - 1]!
  const max = Math.max(
    top.factor * PINCH_MAX_FACTOR_MULTIPLIER,
    PINCH_MAX_FACTOR_FLOOR
  )
  return { min, max }
}

export function currentAbsoluteFactor(
  options: ZoomOption[],
  selectedKey: string | null,
  zoom: number
): number {
  const option =
    options.find(item => item.key === selectedKey) ?? pickDefaultOption(options)
  if (!option) return 1
  return factorFromCameraZoom(lensBaseFactor(option), zoom)
}

/**
 * Map a continuous magnification factor onto the best lens + CameraView zoom.
 * Enables pinch transitions such as 1× → 0.5× (ultra-wide).
 */
export function resolveAbsoluteFactor(
  options: ZoomOption[],
  absoluteFactor: number
): ResolvedZoom | null {
  if (options.length === 0) return null

  const sorted = [...options].sort((a, b) => a.factor - b.factor)
  const { min, max } = pinchFactorRange(options)
  const factor = Math.min(max, Math.max(min, absoluteFactor))

  let option = sorted[0]!
  for (const candidate of sorted) {
    if (candidate.factor <= factor + 1e-9) option = candidate
  }

  const zoom = cameraZoomFromFactor(lensBaseFactor(option), factor)
  return { option, zoom, factor }
}

/**
 * How strongly a pinch scale maps onto absolute magnification.
 * `next = startFactor * scale ** PINCH_FACTOR_EXPO`
 */
export const PINCH_FACTOR_EXPO = 1

export function factorFromPinchScale(
  startFactor: number,
  scale: number,
  expo = PINCH_FACTOR_EXPO
): number {
  if (!Number.isFinite(startFactor) || startFactor <= 0) return 1
  if (!Number.isFinite(scale) || scale <= 0) return startFactor
  return startFactor * scale ** expo
}

export function pinchProgress(
  options: ZoomOption[],
  absoluteFactor: number
): number {
  const { min, max } = pinchFactorRange(options)
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (absoluteFactor - min) / (max - min)))
}

/** Progress positions (0–1) for each discrete zoom chip along the pinch meter. */
export function pinchStepMarks(
  options: ZoomOption[]
): { key: string; factor: number; progress: number }[] {
  const { min, max } = pinchFactorRange(options)
  if (max <= min) {
    return options.map(option => ({
      key: option.key,
      factor: option.factor,
      progress: 0,
    }))
  }

  return [...options]
    .sort((a, b) => a.factor - b.factor)
    .map(option => ({
      key: option.key,
      factor: option.factor,
      progress: Math.min(1, Math.max(0, (option.factor - min) / (max - min))),
    }))
}

/** Nearest discrete chip for the current absolute factor after a pinch. */
export function nearestZoomOption(
  options: ZoomOption[],
  absoluteFactor: number
): ZoomOption | null {
  if (options.length === 0) return null
  return options.reduce((best, option) =>
    Math.abs(option.factor - absoluteFactor) <
    Math.abs(best.factor - absoluteFactor)
      ? option
      : best
  )
}
