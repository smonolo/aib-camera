jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

const mockGetSharedGeoSnapshot = jest.fn()
const mockReverseGeocodeCoords = jest.fn()

jest.mock('@/lib/use-live-geo', () => ({
  getSharedGeoSnapshot: (...args: unknown[]) =>
    mockGetSharedGeoSnapshot(...args),
  useLiveGeoSnapshot: jest.fn(),
}))

jest.mock('@/lib/location', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/location')>('@/lib/location')
  return {
    ...actual,
    reverseGeocodeCoords: (...args: unknown[]) =>
      mockReverseGeocodeCoords(...args),
  }
})

import AsyncStorage from '@react-native-async-storage/async-storage'
import { destinationPoint, haversineMeters } from '@/lib/geo-math'
import {
  buildEffectiveGeoSnapshot,
  clearStickyTarget,
  getEffectiveGeoSnapshot,
  getGeoSourceState,
  hydrateGeoSource,
  lockAimedTarget,
  moveAimedTarget,
  resetGeoSourceForTests,
  setGeoSourceMode,
} from '@/lib/geo-source'
import type { GeoSnapshot, StickyTarget } from '@/lib/types'

const GEO_SOURCE_KEY = 'aib-camera.geo-source.v1'
const takenAt = new Date('2024-07-15T14:30:45.000Z')

function live(overrides: Partial<GeoSnapshot> = {}): GeoSnapshot {
  return {
    lat: 45.4642,
    lon: 9.19,
    accuracy: 8,
    altitude: 120,
    heading: 90,
    address: 'Milano',
    takenAt,
    ...overrides,
  }
}

const sticky: StickyTarget = {
  lat: 45.465,
  lon: 9.192,
  address: 'Target place',
  distanceM: 200,
  lockedHeading: 45,
  lockedAt: '2024-07-15T14:30:00.000Z',
}

beforeEach(async () => {
  resetGeoSourceForTests()
  mockGetSharedGeoSnapshot.mockReset()
  mockReverseGeocodeCoords.mockReset()
  mockReverseGeocodeCoords.mockResolvedValue(null)
  await AsyncStorage.clear()
})

describe('buildEffectiveGeoSnapshot', () => {
  it('returns live geo in me mode', () => {
    const snap = buildEffectiveGeoSnapshot(live(), 'me', sticky)
    expect(snap.lat).toBe(45.4642)
    expect(snap.isAimedTarget).toBe(false)
    expect(snap.targetDistanceM).toBeNull()
    expect(snap.accuracy).toBe(8)
  })

  it('returns sticky target in target mode', () => {
    const snap = buildEffectiveGeoSnapshot(live(), 'target', sticky)
    expect(snap.lat).toBe(sticky.lat)
    expect(snap.lon).toBe(sticky.lon)
    expect(snap.address).toBe('Target place')
    expect(snap.heading).toBe(45)
    expect(snap.accuracy).toBeNull()
    expect(snap.altitude).toBeNull()
    expect(snap.isAimedTarget).toBe(true)
    expect(snap.targetDistanceM).toBe(200)
    expect(snap.takenAt).toBe(takenAt)
  })

  it('falls back to live when target mode has no sticky', () => {
    const snap = buildEffectiveGeoSnapshot(live(), 'target', null)
    expect(snap.lat).toBe(45.4642)
    expect(snap.isAimedTarget).toBe(false)
  })
})

describe('getEffectiveGeoSnapshot', () => {
  it('uses sticky when mode is target', () => {
    resetGeoSourceForTests({ mode: 'target', sticky })
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    const snap = getEffectiveGeoSnapshot()
    expect(snap.isAimedTarget).toBe(true)
    expect(snap.lat).toBe(sticky.lat)
    expect(snap.targetDistanceM).toBe(200)
  })

  it('uses live when mode is me', () => {
    resetGeoSourceForTests({ mode: 'me', sticky })
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    const snap = getEffectiveGeoSnapshot()
    expect(snap.isAimedTarget).toBe(false)
    expect(snap.lat).toBe(45.4642)
  })
})

describe('lockAimedTarget', () => {
  it('locks destination from GPS + heading + distance', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ heading: 90 }))
    mockReverseGeocodeCoords.mockResolvedValue('Punto stimato')

    const result = await lockAimedTarget(200)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const expected = destinationPoint(45.4642, 9.19, 90, 200)
    expect(result.sticky.lat).toBeCloseTo(expected.lat, 6)
    expect(result.sticky.lon).toBeCloseTo(expected.lon, 6)
    expect(result.sticky.distanceM).toBe(200)
    expect(result.sticky.lockedHeading).toBe(90)
    expect(result.sticky.address).toBe('Punto stimato')
    expect(
      haversineMeters(45.4642, 9.19, result.sticky.lat, result.sticky.lon)
    ).toBeCloseTo(200, 0)

    expect(getGeoSourceState()).toEqual({
      mode: 'target',
      sticky: result.sticky,
    })
    expect(mockReverseGeocodeCoords).toHaveBeenCalledWith(
      result.sticky.lat,
      result.sticky.lon
    )

    await new Promise(resolve => setTimeout(resolve, 0))
    const stored = JSON.parse(
      (await AsyncStorage.getItem(GEO_SOURCE_KEY)) ?? 'null'
    )
    expect(stored.mode).toBe('target')
    expect(stored.sticky.distanceM).toBe(200)
  })

  it('soft-fails without GPS', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(
      live({ lat: null, lon: null, heading: 90 })
    )
    await expect(lockAimedTarget(100)).resolves.toEqual({
      ok: false,
      reason: 'no_gps',
    })
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
  })

  it('soft-fails without heading', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ heading: null }))
    await expect(lockAimedTarget(100)).resolves.toEqual({
      ok: false,
      reason: 'no_heading',
    })
  })

  it('soft-fails on bad distance', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    await expect(lockAimedTarget(0)).resolves.toEqual({
      ok: false,
      reason: 'bad_distance',
    })
    await expect(lockAimedTarget(-5)).resolves.toEqual({
      ok: false,
      reason: 'bad_distance',
    })
  })

  it('locks distances beyond the former 50 km cap', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    const result = await lockAimedTarget(50_001)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sticky.distanceM).toBe(50_001)
  })

  it('still locks when reverse geocode returns nothing', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ heading: 0 }))
    mockReverseGeocodeCoords.mockResolvedValue(null)

    const result = await lockAimedTarget(100)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sticky.address).toBeNull()
    expect(getGeoSourceState().mode).toBe('target')
  })
})

describe('moveAimedTarget', () => {
  it('updates sticky lat/lon, distance, and bearing from observer GPS', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ heading: 10 }))
    mockReverseGeocodeCoords.mockResolvedValue('Trascinato')
    const dest = destinationPoint(45.4642, 9.19, 45, 250)

    const result = await moveAimedTarget(dest.lat, dest.lon)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.sticky.lat).toBeCloseTo(dest.lat, 6)
    expect(result.sticky.lon).toBeCloseTo(dest.lon, 6)
    expect(result.sticky.distanceM).toBe(250)
    expect(result.sticky.lockedHeading).toBeCloseTo(45, 0)
    expect(result.sticky.address).toBe('Trascinato')
    expect(getGeoSourceState().mode).toBe('target')
  })

  it('soft-fails without GPS', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ lat: null, lon: null }))
    await expect(moveAimedTarget(45.5, 9.2)).resolves.toEqual({
      ok: false,
      reason: 'no_gps',
    })
  })

  it('soft-fails when dropped on the observer', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    await expect(moveAimedTarget(45.4642, 9.19)).resolves.toEqual({
      ok: false,
      reason: 'bad_distance',
    })
  })

  it('soft-fails on non-finite drop coords', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    await expect(moveAimedTarget(Number.NaN, 9.2)).resolves.toEqual({
      ok: false,
      reason: 'bad_distance',
    })
    await expect(
      moveAimedTarget(45.5, Number.POSITIVE_INFINITY)
    ).resolves.toEqual({
      ok: false,
      reason: 'bad_distance',
    })
  })

  it('accepts drops beyond the former 50 km cap', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    const far = destinationPoint(45.4642, 9.19, 0, 60_000)
    const result = await moveAimedTarget(far.lat, far.lon)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sticky.distanceM).toBe(60_000)
    expect(getGeoSourceState().mode).toBe('target')
  })

  it('locks target mode even when starting from me', async () => {
    resetGeoSourceForTests({ mode: 'me', sticky: null })
    mockGetSharedGeoSnapshot.mockReturnValue(live())
    const dest = destinationPoint(45.4642, 9.19, 180, 100)
    const result = await moveAimedTarget(dest.lat, dest.lon)
    expect(result.ok).toBe(true)
    expect(getGeoSourceState().mode).toBe('target')
  })

  it('soft-fails when only longitude is missing', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ lon: null }))
    await expect(moveAimedTarget(45.5, 9.2)).resolves.toEqual({
      ok: false,
      reason: 'no_gps',
    })
  })
})

describe('geo source mode helpers', () => {
  beforeEach(() => {
    resetGeoSourceForTests({ mode: 'target', sticky })
  })

  it('clears sticky and returns to me', () => {
    clearStickyTarget()
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
  })

  it('refuses target mode without sticky', () => {
    resetGeoSourceForTests({ mode: 'me', sticky: null })
    setGeoSourceMode('target')
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
  })

  it('switches me ↔ target when sticky exists', () => {
    expect(getGeoSourceState().mode).toBe('target')
    setGeoSourceMode('me')
    expect(getGeoSourceState().mode).toBe('me')
    setGeoSourceMode('target')
    expect(getGeoSourceState().mode).toBe('target')
  })

  it('is a no-op when the mode is unchanged', async () => {
    await AsyncStorage.clear()
    setGeoSourceMode('target')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await AsyncStorage.getItem(GEO_SOURCE_KEY)).toBeNull()
  })
})

describe('hydrateGeoSource', () => {
  it('restores sticky target and mode from storage', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'target', sticky })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'target', sticky })
  })

  it('drops target mode when sticky is corrupt', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'target', sticky: { lat: 1 } })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
  })

  it('keeps sticky in me mode when saved that way', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'me', sticky })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky })
  })

  it('ignores invalid JSON and empty storage', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await AsyncStorage.setItem(GEO_SOURCE_KEY, '{not-json')
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
    expect(warn).toHaveBeenCalledWith(
      'Geo source load failed',
      expect.any(SyntaxError)
    )

    await AsyncStorage.clear()
    resetGeoSourceForTests()
    warn.mockClear()
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'me', sticky: null })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('rejects sticky with non-positive or oversize distance', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({
        mode: 'target',
        sticky: { ...sticky, distanceM: 0 },
      })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState().sticky).toBeNull()
  })

  it('coerces non-string sticky address to null', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({
        mode: 'target',
        sticky: { ...sticky, address: 42 },
      })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    expect(getGeoSourceState().sticky?.address).toBeNull()
    expect(getGeoSourceState().mode).toBe('target')
  })

  it('does not re-read storage after the first hydrate', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'target', sticky })
    )
    resetGeoSourceForTests()
    await hydrateGeoSource()
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'me', sticky: null })
    )
    await hydrateGeoSource()
    expect(getGeoSourceState()).toEqual({ mode: 'target', sticky })
  })

  it('dedupes concurrent hydrate calls', async () => {
    await AsyncStorage.setItem(
      GEO_SOURCE_KEY,
      JSON.stringify({ mode: 'target', sticky })
    )
    resetGeoSourceForTests()
    await Promise.all([hydrateGeoSource(), hydrateGeoSource()])
    expect(getGeoSourceState()).toEqual({ mode: 'target', sticky })
  })
})

describe('lockAimedTarget presets', () => {
  it('locks each Aim distance preset', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(live({ heading: 45 }))
    for (const distance of [1000, 2000, 5000, 10000] as const) {
      resetGeoSourceForTests()
      const result = await lockAimedTarget(distance)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.sticky.distanceM).toBe(distance)
      expect(
        haversineMeters(45.4642, 9.19, result.sticky.lat, result.sticky.lon)
      ).toBeCloseTo(distance, 0)
    }
  })

  it('soft-fails when only latitude is missing', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue(
      live({ lat: null, lon: 9.19, heading: 90 })
    )
    await expect(lockAimedTarget(100)).resolves.toEqual({
      ok: false,
      reason: 'no_gps',
    })
  })
})
