jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getHeadingAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
}))

import {
  applyHeadingOrientationOffset,
  getSharedGeoSnapshot,
  mergeHeadingUpdate,
  mergePositionUpdate,
  resetLiveGeoForTests,
} from '@/lib/use-live-geo'
import {
  emptyGeoSnapshot,
  resetGeocodeMemory,
  seedSmoothedHeading,
  setHeadingOrientationOffset,
} from '@/lib/location'
import type { GeoSnapshot } from '@/lib/types'

const takenAt = new Date('2024-07-15T14:30:45.000Z')

function snap(overrides: Partial<GeoSnapshot> = {}): GeoSnapshot {
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

beforeEach(() => {
  resetGeocodeMemory()
  setHeadingOrientationOffset(0)
  resetLiveGeoForTests()
})

describe('mergeHeadingUpdate', () => {
  it('keeps the previous heading when the sample is null', () => {
    expect(mergeHeadingUpdate(snap({ heading: 40 }), null).heading).toBe(40)
  })

  it('keeps the previous heading when the sample is non-finite', () => {
    expect(mergeHeadingUpdate(snap({ heading: 40 }), Number.NaN).heading).toBe(
      40
    )
    expect(
      mergeHeadingUpdate(snap({ heading: 40 }), Number.POSITIVE_INFINITY)
        .heading
    ).toBe(40)
  })

  it('accepts a zero heading', () => {
    expect(mergeHeadingUpdate(snap({ heading: 40 }), 0).heading).toBe(0)
  })

  it('preserves takenAt and coordinates', () => {
    const current = snap()
    const next = mergeHeadingUpdate(current, 180)
    expect(next.takenAt).toBe(current.takenAt)
    expect(next.lat).toBe(current.lat)
    expect(next.lon).toBe(current.lon)
    expect(next.heading).toBe(180)
  })
})

describe('mergePositionUpdate', () => {
  it('rejects missing or non-finite coordinates', () => {
    expect(
      mergePositionUpdate(snap(), {
        lat: Number.NaN,
        lon: 9.19,
        accuracy: 5,
        altitude: 10,
        address: null,
      })
    ).toBeNull()
    expect(
      mergePositionUpdate(snap(), {
        lat: 45.5,
        lon: Number.POSITIVE_INFINITY,
        accuracy: 5,
        altitude: 10,
        address: null,
      })
    ).toBeNull()
    expect(
      mergePositionUpdate(snap(), {
        lat: null as unknown as number,
        lon: 9.19,
        accuracy: 5,
        altitude: 10,
        address: null,
      })
    ).toBeNull()
  })

  it('merges a valid fix without clearing heading', () => {
    const at = new Date('2024-07-15T14:31:00.000Z')
    const next = mergePositionUpdate(
      snap({ heading: 77, address: 'Old' }),
      {
        lat: 45.5,
        lon: 9.2,
        accuracy: 4,
        altitude: 99,
        address: 'New',
      },
      at
    )
    expect(next).toEqual({
      lat: 45.5,
      lon: 9.2,
      accuracy: 4,
      altitude: 99,
      heading: 77,
      address: 'New',
      takenAt: at,
    })
  })

  it('allows null address altitude and accuracy', () => {
    const next = mergePositionUpdate(
      snap(),
      {
        lat: 1,
        lon: 2,
        accuracy: null,
        altitude: null,
        address: null,
      },
      takenAt
    )
    expect(next?.lat).toBe(1)
    expect(next?.lon).toBe(2)
    expect(next?.accuracy).toBeNull()
    expect(next?.altitude).toBeNull()
    expect(next?.address).toBeNull()
  })
})

describe('applyHeadingOrientationOffset', () => {
  it('rotates shared heading with the orientation delta', () => {
    seedSmoothedHeading(10)
    resetLiveGeoForTests(snap({ heading: 10 }))
    setHeadingOrientationOffset(0)

    applyHeadingOrientationOffset(90)

    expect(getSharedGeoSnapshot().heading).toBe(100)
    expect(getSharedGeoSnapshot().lat).toBe(45.4642)
  })

  it('rotates shared heading when smoothed heading is not ready yet', () => {
    resetLiveGeoForTests(snap({ heading: 55 }))
    setHeadingOrientationOffset(0)
    applyHeadingOrientationOffset(90)
    expect(getSharedGeoSnapshot().heading).toBe(145)
  })
})

describe('resetLiveGeoForTests', () => {
  it('clears shared geo back to empty', () => {
    resetLiveGeoForTests(snap())
    expect(getSharedGeoSnapshot().lat).toBe(45.4642)
    resetLiveGeoForTests()
    expect(getSharedGeoSnapshot()).toMatchObject({
      ...emptyGeoSnapshot(),
      takenAt: expect.any(Date),
    })
  })
})
