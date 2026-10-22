import { Platform } from 'react-native'

import {
  buildIosZoomOptions,
  defaultZoomOptions,
  formatZoomLabel,
  pickDefaultOption,
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
