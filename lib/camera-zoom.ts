import { Platform } from 'react-native'

type ZoomKind = 'ultraWide' | 'wide' | 'tele'

export type ZoomOption = {
  key: string
  kind: ZoomKind
  factor: number
  lens?: string
  zoom: number
}

type ResolvedZoom = {
  option: ZoomOption
  zoom: number
  factor: number
}

const ASSUMED_DEVICE_MAX_ZOOM = 125

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

export function snapMajorZoomFactor(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) return 1
  if (factor < 0.75) return 0.5
  return Math.max(1, Math.round(factor))
}

export function formatZoomChipLabel(
  option: ZoomOption,
  selectedKey: string | null,
  liveFactor: number,
  useComma: boolean
): string {
  const active = option.key === selectedKey
  if (
    active &&
    option.kind === 'tele' &&
    Number.isFinite(liveFactor) &&
    liveFactor > option.factor + 1e-9
  ) {
    return formatZoomLabel(snapMajorZoomFactor(liveFactor), useComma, true)
  }
  return formatZoomLabel(option.factor, useComma, active)
}

function normalizedZoomForFactor(
  factor: number,
  assumedMax = ASSUMED_DEVICE_MAX_ZOOM
): number {
  if (factor <= 1) return 0
  return Math.min(1, Math.log(factor) / Math.log(assumedMax))
}

export type CameraLensInfo = {
  deviceType: string
  localizedName: string
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
    /ultrawide|ultra\s*-?\s*wide|builtinultrawide|ultra\s*grandangolare|grandangolo\s*ultra|ultra\s*weit|super\s*wide/.test(
      n
    )
  ) {
    return 'ultraWide'
  }

  if (
    /telephoto|builtintelephoto|teleobiettivo|t[eé]l[eé]objectif|\btele\b/.test(
      n
    )
  ) {
    return 'tele'
  }

  if (
    /wideangle|wide\s*angle|builtinwide|grandangolare|weitwinkel|wide|fotocamera|camera|arri[eè]re|back|rear|posteriore/.test(
      n
    )
  ) {
    return 'wide'
  }

  return null
}

function classifyLens(lens: CameraLensInfo): ZoomKind | null {
  return (
    classifyLensName(lens.deviceType) ?? classifyLensName(lens.localizedName)
  )
}

export function buildIosZoomOptions(lenses: CameraLensInfo[]): ZoomOption[] {
  const byKind = new Map<ZoomKind, string>()

  for (const lens of lenses) {
    const kind = classifyLens(lens)
    if (!kind || byKind.has(kind)) continue
    byKind.set(kind, lens.deviceType)
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

export function clampCameraZoom(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

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

export function factorFromPinchScale(
  startFactor: number,
  scale: number
): number {
  if (!Number.isFinite(startFactor) || startFactor <= 0) return 1
  if (!Number.isFinite(scale) || scale <= 0) return startFactor
  return startFactor * scale
}
