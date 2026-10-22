import * as Location from 'expo-location'

import {
  captureGeoSnapshot,
  ensureForegroundLocationPermission,
  formatGeocodeAddress,
  geocodeCellKey,
  headingFromLocationHeading,
  normalizeHeadingDegrees,
  resetGeocodeMemory,
  withTimeout,
} from '@/lib/location'

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

const mockedLocation = Location as jest.Mocked<typeof Location>

beforeEach(() => {
  resetGeocodeMemory()
  jest.clearAllMocks()
})

describe('normalizeHeadingDegrees', () => {
  it('wraps negative and oversized values', () => {
    expect(normalizeHeadingDegrees(-10)).toBe(350)
    expect(normalizeHeadingDegrees(370)).toBe(10)
    expect(normalizeHeadingDegrees(45.4)).toBe(45)
  })
})

describe('headingFromLocationHeading', () => {
  it('prefers true heading when available', () => {
    expect(
      headingFromLocationHeading({
        trueHeading: 12.2,
        magHeading: 99,
        accuracy: 1,
      })
    ).toBe(12)
  })

  it('falls back to magnetic heading', () => {
    expect(
      headingFromLocationHeading({
        trueHeading: -1,
        magHeading: 181.6,
        accuracy: 1,
      })
    ).toBe(182)
  })

  it('returns null when neither heading is valid', () => {
    expect(
      headingFromLocationHeading({
        trueHeading: -1,
        magHeading: -1,
        accuracy: 1,
      })
    ).toBeNull()
  })
})

describe('geocodeCellKey', () => {
  it('buckets coordinates to 3 decimals', () => {
    expect(geocodeCellKey(45.464211, 9.190011)).toBe('45.464,9.190')
  })
})

describe('formatGeocodeAddress', () => {
  it('joins unique place parts', () => {
    expect(
      formatGeocodeAddress({
        name: 'Duomo',
        street: 'Piazza del Duomo',
        streetNumber: '1',
        city: 'Milano',
        district: 'Centro',
        subregion: 'Milano',
        region: 'Lombardia',
        country: 'Italy',
        postalCode: '20121',
        isoCountryCode: 'IT',
        timezone: 'Europe/Rome',
        formattedAddress: null,
      })
    ).toBe('Duomo · Centro · Milano · Piazza del Duomo 1 · Lombardia')
  })

  it('skips duplicate name/street values', () => {
    expect(
      formatGeocodeAddress({
        name: 'Via Roma',
        street: 'Via Roma',
        streetNumber: null,
        city: 'Como',
        district: null,
        subregion: null,
        region: 'Lombardia',
        country: 'Italy',
        postalCode: null,
        isoCountryCode: 'IT',
        timezone: null,
        formattedAddress: null,
      })
    ).toBe('Como · Via Roma · Lombardia')
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects when the promise is too slow', async () => {
    const pending = withTimeout(new Promise(() => {}), 50, 'slow')
    const expectation = expect(pending).rejects.toThrow('slow')
    await jest.advanceTimersByTimeAsync(50)
    await expectation
  })

  it('resolves when the promise wins the race', async () => {
    const pending = withTimeout(Promise.resolve('ok'), 1000, 'slow')
    await expect(pending).resolves.toBe('ok')
  })
})

function permission(granted: boolean, canAskAgain = true) {
  return {
    granted,
    canAskAgain,
    status: granted ? 'granted' : 'denied',
    expires: 'never',
  } as never
}

describe('ensureForegroundLocationPermission', () => {
  it('returns true when already granted', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    await expect(ensureForegroundLocationPermission()).resolves.toBe(true)
    expect(
      mockedLocation.requestForegroundPermissionsAsync
    ).not.toHaveBeenCalled()
  })

  it('does not prompt when the system blocks asking again', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(false, false)
    )
    await expect(ensureForegroundLocationPermission()).resolves.toBe(false)
    expect(
      mockedLocation.requestForegroundPermissionsAsync
    ).not.toHaveBeenCalled()
  })

  it('requests permission when allowed', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(false)
    )
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    await expect(ensureForegroundLocationPermission()).resolves.toBe(true)
  })
})

describe('captureGeoSnapshot', () => {
  it('returns an empty snapshot without location permission', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(false)
    )

    const snap = await captureGeoSnapshot({ headingHint: 90 })
    expect(snap).toMatchObject({
      lat: null,
      lon: null,
      accuracy: null,
      altitude: null,
      heading: 90,
      address: null,
    })
    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('captures coords, address, and heading when available', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.46,
        longitude: 9.19,
        accuracy: 6,
        altitude: 110,
        altitudeAccuracy: 4,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    } as never)
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        name: 'Duomo',
        street: null,
        streetNumber: null,
        city: 'Milano',
        district: null,
        subregion: null,
        region: 'Lombardia',
        country: 'Italy',
        postalCode: null,
        isoCountryCode: 'IT',
        timezone: 'Europe/Rome',
        formattedAddress: null,
      },
    ] as never)
    mockedLocation.getHeadingAsync.mockResolvedValue({
      trueHeading: 44.6,
      magHeading: 10,
      accuracy: 1,
    } as never)

    const snap = await captureGeoSnapshot()
    expect(snap).toMatchObject({
      lat: 45.46,
      lon: 9.19,
      accuracy: 6,
      altitude: 110,
      heading: 45,
      address: 'Duomo · Milano · Lombardia',
    })
  })

  it('uses the heading hint and skips compass sampling', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.46,
        longitude: 9.19,
        accuracy: 6,
        altitude: null,
        altitudeAccuracy: null,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    } as never)
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([] as never)

    const snap = await captureGeoSnapshot({ headingHint: 180 })
    expect(snap.heading).toBe(180)
    expect(mockedLocation.getHeadingAsync).not.toHaveBeenCalled()
  })
})
