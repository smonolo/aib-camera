import { Platform } from 'react-native'

import {
  buildIosZoomOptions,
  cameraZoomFromFactor,
  clampCameraZoom,
  currentAbsoluteFactor,
  defaultZoomOptions,
  factorFromCameraZoom,
  factorFromPinchScale,
  formatZoomChipLabel,
  formatZoomLabel,
  snapMajorZoomFactor,
  lensBaseFactor,
  pickDefaultOption,
  pinchFactorRange,
  resolveAbsoluteFactor,
  type ZoomOption,
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

describe('snapMajorZoomFactor', () => {
  it('keeps ultra-wide and whole-number steps only', () => {
    expect(snapMajorZoomFactor(0.5)).toBe(0.5)
    expect(snapMajorZoomFactor(0.7)).toBe(0.5)
    expect(snapMajorZoomFactor(1.2)).toBe(1)
    expect(snapMajorZoomFactor(2.4)).toBe(2)
    expect(snapMajorZoomFactor(2.6)).toBe(3)
    expect(snapMajorZoomFactor(4.2)).toBe(4)
    expect(snapMajorZoomFactor(7.8)).toBe(8)
  })
})

describe('formatZoomChipLabel', () => {
  const ultra: ZoomOption = {
    key: 'ultraWide',
    kind: 'ultraWide',
    factor: 0.5,
    zoom: 0,
  }
  const wide: ZoomOption = {
    key: 'wide',
    kind: 'wide',
    factor: 1,
    zoom: 0,
  }
  const tele: ZoomOption = {
    key: 'tele',
    kind: 'tele',
    factor: 2,
    zoom: 0,
  }

  it('keeps 0.5× and 1× fixed even when active above base', () => {
    expect(formatZoomChipLabel(ultra, 'ultraWide', 0.9, false)).toBe('0.5×')
    expect(formatZoomChipLabel(wide, 'wide', 1.7, false)).toBe('1×')
  })

  it('keeps tele nominal when inactive or at/below 2×', () => {
    expect(formatZoomChipLabel(tele, 'wide', 4, false)).toBe('2')
    expect(formatZoomChipLabel(tele, 'tele', 2, false)).toBe('2×')
    expect(formatZoomChipLabel(tele, 'tele', 1.8, false)).toBe('2×')
  })

  it('shows major live steps only on the active tele chip above 2×', () => {
    expect(formatZoomChipLabel(tele, 'tele', 3, false)).toBe('3×')
    expect(formatZoomChipLabel(tele, 'tele', 4.2, true)).toBe('4×')
    expect(formatZoomChipLabel(tele, 'tele', 2.4, false)).toBe('2×')
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

describe('pinchFactorRange', () => {
  it('exposes a factor range starting at ultra-wide', () => {
    const options = buildIosZoomOptions([
      'Back Ultra Wide Camera',
      'Back Camera',
    ])
    const range = pinchFactorRange(options)
    expect(range.min).toBe(0.5)
    expect(range.max).toBeGreaterThan(range.min)
  })
})
