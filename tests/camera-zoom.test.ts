import { Platform } from 'react-native'

import {
  buildIosZoomOptions,
  cameraZoomFromFactor,
  clampCameraZoom,
  currentAbsoluteFactor,
  defaultZoomOptions,
  factorFromCameraZoom,
  factorFromPinchScale,
  formatLiveZoomFactor,
  formatZoomLabel,
  lensBaseFactor,
  nearestZoomOption,
  pickDefaultOption,
  pinchFactorRange,
  pinchProgress,
  pinchStepMarks,
  resolveAbsoluteFactor,
} from '@/lib/camera-zoom'

describe('formatZoomLabel', () => {
  it('formats integer and half factors', () => {
    expect(formatZoomLabel(1, false, false)).toBe('1')
    expect(formatZoomLabel(0.5, false, false)).toBe('0.5')
    expect(formatZoomLabel(0.5, true, false)).toBe('0,5')
  })

  it('marks the active option with a multiply sign', () => {
    expect(formatZoomLabel(2, false, true)).toBe('2×')
  })
})

describe('formatLiveZoomFactor', () => {
  it('shows one decimal for fractional zoom', () => {
    expect(formatLiveZoomFactor(8.24, false)).toBe('8.2×')
    expect(formatLiveZoomFactor(8.24, true)).toBe('8,2×')
  })

  it('keeps clean labels for chip factors', () => {
    expect(formatLiveZoomFactor(1, false)).toBe('1×')
    expect(formatLiveZoomFactor(0.5, true)).toBe('0,5×')
  })
})

describe('buildIosZoomOptions', () => {
  it('classifies ultra-wide, wide, and tele lenses', () => {
    const options = buildIosZoomOptions([
      'Back Dual Camera',
      'Back Ultra Wide Camera',
      'Back Camera',
      'Back Telephoto Camera',
    ])

    expect(options.map(option => option.kind)).toEqual([
      'ultraWide',
      'wide',
      'tele',
    ])
    expect(options.find(option => option.kind === 'ultraWide')?.factor).toBe(
      0.5
    )
    expect(options.find(option => option.kind === 'wide')?.zoom).toBe(0)
    expect(options.find(option => option.kind === 'tele')?.zoom).toBe(0)
  })

  it('adds digital 2× tele when only a wide lens exists', () => {
    const options = buildIosZoomOptions(['Back Wide Angle Camera'])
    expect(options).toHaveLength(2)
    expect(options[1]).toMatchObject({
      key: 'tele-digital',
      kind: 'tele',
      factor: 2,
    })
    expect(options[1]!.zoom).toBeGreaterThan(0)
  })

  it('ignores composite / virtual lenses', () => {
    expect(
      buildIosZoomOptions(['Back Dual Wide Camera', 'TrueDepth Camera'])
    ).toEqual([])
  })
})

describe('defaultZoomOptions', () => {
  const original = Platform.OS

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: original,
    })
  })

  it('returns empty on iOS (lenses come from the device)', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    expect(defaultZoomOptions()).toEqual([])
  })

  it('returns wide + digital tele on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    const options = defaultZoomOptions()
    expect(options.map(option => option.key)).toEqual(['wide', 'tele-digital'])
  })
})

describe('pickDefaultOption', () => {
  it('prefers wide when present', () => {
    const options = buildIosZoomOptions([
      'Back Ultra Wide Camera',
      'Back Camera',
      'Back Telephoto Camera',
    ])
    expect(pickDefaultOption(options)?.kind).toBe('wide')
  })

  it('returns null for an empty list', () => {
    expect(pickDefaultOption([])).toBeNull()
  })
})

describe('clampCameraZoom', () => {
  it('clamps to the 0–1 CameraView range', () => {
    expect(clampCameraZoom(-0.2)).toBe(0)
    expect(clampCameraZoom(0.4)).toBe(0.4)
    expect(clampCameraZoom(1.5)).toBe(1)
    expect(clampCameraZoom(Number.NaN)).toBe(0)
  })
})

describe('absolute factor mapping', () => {
  const options = buildIosZoomOptions([
    'Back Ultra Wide Camera',
    'Back Camera',
    'Back Telephoto Camera',
  ])

  it('uses the correct lens base for each option', () => {
    expect(lensBaseFactor(options[0]!)).toBe(0.5)
    expect(lensBaseFactor(options[1]!)).toBe(1)
    expect(lensBaseFactor(options[2]!)).toBe(2)
  })

  it('converts between camera zoom and absolute factor', () => {
    expect(factorFromCameraZoom(1, 0)).toBe(1)
    expect(cameraZoomFromFactor(1, 1)).toBe(0)
    expect(factorFromCameraZoom(0.5, 0)).toBe(0.5)
    expect(cameraZoomFromFactor(0.5, 0.5)).toBe(0)
  })

  it('switches to ultra-wide when pinching out below 1×', () => {
    const resolved = resolveAbsoluteFactor(options, 0.5)
    expect(resolved?.option.key).toBe('ultraWide')
    expect(resolved?.zoom).toBe(0)
  })

  it('keeps wide between 1× and 2×', () => {
    const resolved = resolveAbsoluteFactor(options, 1.4)
    expect(resolved?.option.key).toBe('wide')
    expect(resolved?.zoom).toBeGreaterThan(0)
  })

  it('switches to tele at 2× and above', () => {
    const resolved = resolveAbsoluteFactor(options, 2)
    expect(resolved?.option.key).toBe('tele')
    expect(resolved?.zoom).toBe(0)
  })

  it('reads the current absolute factor from chip + zoom', () => {
    expect(currentAbsoluteFactor(options, 'wide', 0)).toBe(1)
    expect(currentAbsoluteFactor(options, 'ultraWide', 0)).toBe(0.5)
  })
})

describe('factorFromPinchScale', () => {
  it('scales magnification from the pinch start factor', () => {
    expect(factorFromPinchScale(1, 1)).toBeCloseTo(1)
    expect(factorFromPinchScale(1, 2)).toBeCloseTo(2)
    expect(factorFromPinchScale(1, 0.5)).toBeCloseTo(0.5)
  })
})

describe('pinch meter helpers', () => {
  const options = buildIosZoomOptions(['Back Ultra Wide Camera', 'Back Camera'])

  it('exposes a factor range starting at ultra-wide', () => {
    const range = pinchFactorRange(options)
    expect(range.min).toBe(0.5)
    expect(range.max).toBeGreaterThan(range.min)
  })

  it('maps absolute factor onto a 0–1 progress value', () => {
    expect(pinchProgress(options, 0.5)).toBe(0)
    expect(pinchProgress(options, pinchFactorRange(options).max)).toBe(1)
  })

  it('places step marks at each discrete zoom chip', () => {
    const marks = pinchStepMarks(options)
    expect(marks.map(mark => mark.factor)).toEqual([0.5, 1, 2])
    expect(marks[0]?.progress).toBe(0)
    expect(marks[1]?.progress).toBeGreaterThan(0)
    expect(marks[1]?.progress).toBeLessThan(1)
    expect(marks[2]?.progress).toBeGreaterThan(marks[1]!.progress)
  })
})

describe('nearestZoomOption', () => {
  it('picks the closest discrete chip by absolute factor', () => {
    const options = buildIosZoomOptions([
      'Back Ultra Wide Camera',
      'Back Camera',
    ])
    expect(nearestZoomOption(options, 0.55)?.key).toBe('ultraWide')
    expect(nearestZoomOption(options, 0.9)?.key).toBe('wide')
  })

  it('picks digital tele when closer on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    })
    const androidOptions = defaultZoomOptions()
    expect(nearestZoomOption(androidOptions, 1.8)?.key).toBe('tele-digital')
    expect(nearestZoomOption(androidOptions, 1.1)?.key).toBe('wide')
  })
})
