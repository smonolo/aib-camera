import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

import {
  captureGeoSnapshot,
  emptyGeoSnapshot,
  ensureForegroundLocationPermission,
  formatGeocodeAddress,
  geocodeCellKey,
  HEADING_SCREEN_ORIENTATION,
  headingFromLocationHeading,
  headingOffsetForScreenOrientation,
  headingOrientationOffsetDegrees,
  normalizeHeadingDegrees,
  orientHeadingDegrees,
  resetGeocodeMemory,
  reverseGeocodeCoords,
  setHeadingOrientationOffset,
  smoothHeadingDegrees,
  updateSmoothedHeading,
  watchHeading,
  watchPosition,
  withTimeout,
} from '@/lib/location'
import { resetStorageCaches, upsertGeocodeCacheEntry } from '@/lib/storage'

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

beforeEach(async () => {
  resetGeocodeMemory()
  resetStorageCaches()
  await AsyncStorage.clear()
  jest.resetAllMocks()
})

describe('emptyGeoSnapshot', () => {
  it('returns null geo fields with optional heading', () => {
    const takenAt = new Date('2024-07-15T14:30:45.000Z')
    expect(emptyGeoSnapshot(takenAt, 42)).toEqual({
      lat: null,
      lon: null,
      accuracy: null,
      altitude: null,
      heading: 42,
      address: null,
      takenAt,
    })
  })
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

  it('rejects unreliable compass calibration', () => {
    expect(
      headingFromLocationHeading({
        trueHeading: 40,
        magHeading: 40,
        accuracy: 0,
      })
    ).toBeNull()
  })
})

describe('smoothHeadingDegrees', () => {
  it('returns the first sample normalized', () => {
    expect(smoothHeadingDegrees(10.4, null)).toBe(10)
  })

  it('blends across the 0/360 wrap', () => {
    expect(smoothHeadingDegrees(10, 350, 0.5)).toBe(0)
  })
})

describe('heading orientation compensation', () => {
  it('maps interface orientation to compass offsets', () => {
    expect(headingOrientationOffsetDegrees('portrait')).toBe(0)
    expect(headingOrientationOffsetDegrees('landscape-left')).toBe(-90)
    expect(headingOrientationOffsetDegrees('landscape-right')).toBe(90)
    expect(headingOrientationOffsetDegrees('portrait-down')).toBe(180)
    expect(headingOrientationOffsetDegrees('unknown')).toBe(0)
  })

  it('maps expo screen-orientation enum values to the same offsets', () => {
    expect(
      headingOffsetForScreenOrientation(HEADING_SCREEN_ORIENTATION.PORTRAIT_UP)
    ).toBe(0)
    expect(
      headingOffsetForScreenOrientation(
        HEADING_SCREEN_ORIENTATION.LANDSCAPE_LEFT
      )
    ).toBe(-90)
    expect(
      headingOffsetForScreenOrientation(
        HEADING_SCREEN_ORIENTATION.LANDSCAPE_RIGHT
      )
    ).toBe(90)
    expect(
      headingOffsetForScreenOrientation(
        HEADING_SCREEN_ORIENTATION.PORTRAIT_DOWN
      )
    ).toBe(180)
    expect(
      headingOffsetForScreenOrientation(HEADING_SCREEN_ORIENTATION.UNKNOWN)
    ).toBe(0)
    expect(headingOffsetForScreenOrientation(99)).toBe(0)
  })

  it('keeps camera-facing heading stable across landscape rotation', () => {
    expect(orientHeadingDegrees(160, 90)).toBe(250)
    expect(orientHeadingDegrees(340, -90)).toBe(250)
    expect(orientHeadingDegrees(10, 180)).toBe(190)
  })

  it('applies the active orientation offset while smoothing', () => {
    setHeadingOrientationOffset(90)
    expect(
      updateSmoothedHeading({
        trueHeading: 160,
        magHeading: 160,
        accuracy: 2,
      })
    ).toBe(250)
  })

  it('rotates the smoothed heading when the orientation offset changes', () => {
    setHeadingOrientationOffset(0)
    expect(
      updateSmoothedHeading({
        trueHeading: 250,
        magHeading: 250,
        accuracy: 2,
      })
    ).toBe(250)

    expect(setHeadingOrientationOffset(90)).toBe(340)
    expect(
      updateSmoothedHeading({
        trueHeading: 160,
        magHeading: 160,
        accuracy: 2,
      })
    ).toBe(315)
  })
})

describe('updateSmoothedHeading', () => {
  it('keeps the last good heading when a sample is unreliable', () => {
    expect(
      updateSmoothedHeading({
        trueHeading: 90,
        magHeading: 90,
        accuracy: 2,
      })
    ).toBe(90)
    expect(
      updateSmoothedHeading({
        trueHeading: 200,
        magHeading: 200,
        accuracy: 0,
      })
    ).toBe(90)
  })

  it('keeps the last good heading when neither heading value is valid', () => {
    expect(
      updateSmoothedHeading({
        trueHeading: 90,
        magHeading: 90,
        accuracy: 2,
      })
    ).toBe(90)
    expect(
      updateSmoothedHeading({
        trueHeading: -1,
        magHeading: -1,
        accuracy: 0,
      })
    ).toBe(90)
  })
})

describe('geocodeCellKey', () => {
  it('buckets coordinates to 3 decimals', () => {
    expect(geocodeCellKey(45.464211, 9.190011)).toBe('45.464,9.190')
  })
})

describe('reverseGeocodeCoords sticky place', () => {
  function geocodeResult(city: string) {
    return [
      {
        name: null,
        street: null,
        streetNumber: null,
        city,
        district: null,
        subregion: null,
        region: 'Lombardia',
        country: 'Italy',
        postalCode: null,
        isoCountryCode: 'IT',
        timezone: 'Europe/Rome',
        formattedAddress: null,
      },
    ] as never
  }

  it('keeps the first place until the phone moves hundreds of meters', async () => {
    mockedLocation.reverseGeocodeAsync
      .mockResolvedValueOnce(geocodeResult('Pieve Fissiraga'))
      .mockResolvedValueOnce(geocodeResult('Melegnano'))

    await expect(reverseGeocodeCoords(45.35, 9.28)).resolves.toBe(
      'Pieve Fissiraga · Lombardia'
    )
    await expect(reverseGeocodeCoords(45.35, 9.2828)).resolves.toBe(
      'Pieve Fissiraga · Lombardia'
    )
    expect(mockedLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(1)
  })

  it('refreshes the place after a long move', async () => {
    mockedLocation.reverseGeocodeAsync
      .mockResolvedValueOnce(geocodeResult('Pieve Fissiraga'))
      .mockResolvedValueOnce(geocodeResult('Lodi'))

    await expect(reverseGeocodeCoords(45.35, 9.28)).resolves.toBe(
      'Pieve Fissiraga · Lombardia'
    )
    await expect(reverseGeocodeCoords(45.35, 9.294)).resolves.toBe(
      'Lodi · Lombardia'
    )
    expect(mockedLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(2)
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

  it('skips heading fetch when requested and keeps the hint', async () => {
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
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([] as never)

    const snap = await captureGeoSnapshot({
      headingHint: 123,
      skipHeadingFetch: true,
    })

    expect(snap.heading).toBe(123)
    expect(mockedLocation.getHeadingAsync).not.toHaveBeenCalled()
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

  it('orients sampled compass headings for the active screen orientation', async () => {
    setHeadingOrientationOffset(90)
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
    mockedLocation.getHeadingAsync.mockResolvedValue({
      trueHeading: 160,
      magHeading: 160,
      accuracy: 2,
    } as never)

    const snap = await captureGeoSnapshot()
    expect(snap.heading).toBe(250)
  })

  it('leaves heading hints untouched by orientation offset', async () => {
    setHeadingOrientationOffset(90)
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

    const snap = await captureGeoSnapshot({ headingHint: 250 })
    expect(snap.heading).toBe(250)
    expect(mockedLocation.getHeadingAsync).not.toHaveBeenCalled()
  })

  it('accepts a bare heading hint number for backward compatibility', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.46,
        longitude: 9.19,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    } as never)
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([] as never)

    const snap = await captureGeoSnapshot(123)
    expect(snap.heading).toBe(123)
    expect(snap.accuracy).toBeNull()
    expect(mockedLocation.getHeadingAsync).not.toHaveBeenCalled()
  })

  it('falls back to last-known position when the fresh fix times out', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.getCurrentPositionAsync.mockImplementation(
      () => new Promise(() => {})
    )
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.1,
        longitude: 9.1,
        accuracy: 40,
        altitude: 50,
        altitudeAccuracy: null,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    } as never)
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([] as never)

    const snap = await captureGeoSnapshot({
      headingHint: 10,
      positionTimeoutMs: 20,
    })
    expect(snap).toMatchObject({
      lat: 45.1,
      lon: 9.1,
      accuracy: 40,
      altitude: 50,
      heading: 10,
    })
  })

  it('returns an empty snapshot when position and last-known both fail', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.getCurrentPositionAsync.mockRejectedValue(
      new Error('no fix')
    )
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue(null)

    const snap = await captureGeoSnapshot({ headingHint: 77 })
    expect(snap).toMatchObject({
      lat: null,
      lon: null,
      heading: 77,
      address: null,
    })
  })

  it('leaves heading null when compass sampling fails', async () => {
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
    mockedLocation.getHeadingAsync.mockRejectedValue(new Error('no compass'))

    const snap = await captureGeoSnapshot()
    expect(snap.heading).toBeNull()
    expect(snap.lat).toBe(45.46)
  })
})

describe('watchPosition / watchHeading', () => {
  it('returns null without location permission', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(false)
    )
    await expect(watchPosition(jest.fn())).resolves.toBeNull()
    await expect(watchHeading(jest.fn())).resolves.toBeNull()
    expect(mockedLocation.watchPositionAsync).not.toHaveBeenCalled()
    expect(mockedLocation.watchHeadingAsync).not.toHaveBeenCalled()
  })

  it('returns null when watch APIs throw', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.watchPositionAsync.mockRejectedValue(new Error('watch boom'))
    mockedLocation.watchHeadingAsync.mockRejectedValue(
      new Error('heading boom')
    )
    await expect(watchPosition(jest.fn())).resolves.toBeNull()
    await expect(watchHeading(jest.fn())).resolves.toBeNull()
  })

  it('forwards position updates and refreshes address after geocode', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    const remove = jest.fn()
    mockedLocation.watchPositionAsync.mockImplementation(async (_opts, cb) => {
      cb({
        coords: {
          latitude: 45.46,
          longitude: 9.19,
          accuracy: 5,
          altitude: 100,
          altitudeAccuracy: null,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      } as never)
      return { remove } as never
    })
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        name: null,
        street: null,
        streetNumber: null,
        city: 'Milano',
        district: null,
        subregion: null,
        region: 'Lombardia',
        country: 'Italy',
        postalCode: null,
        isoCountryCode: 'IT',
        timezone: null,
        formattedAddress: null,
      },
    ] as never)

    const onUpdate = jest.fn()
    const sub = await watchPosition(onUpdate)
    expect(sub).toEqual({ remove })
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 45.46,
        lon: 9.19,
        accuracy: 5,
        altitude: 100,
      })
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        address: 'Milano · Lombardia',
      })
    )
  })

  it('forwards smoothed heading updates', async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(
      permission(true)
    )
    mockedLocation.watchHeadingAsync.mockImplementation(async cb => {
      cb({ trueHeading: 40, magHeading: 40, accuracy: 2 } as never)
      return { remove: jest.fn() } as never
    })

    const onUpdate = jest.fn()
    await watchHeading(onUpdate)
    expect(onUpdate).toHaveBeenCalledWith(40)
  })
})

describe('reverseGeocodeCoords failures', () => {
  it('returns null when network geocode fails and cache is empty', async () => {
    mockedLocation.reverseGeocodeAsync.mockRejectedValue(new Error('offline'))
    await expect(reverseGeocodeCoords(45.46, 9.19)).resolves.toBeNull()
  })

  it('falls back to the on-device geocode cache when the network fails', async () => {
    await upsertGeocodeCacheEntry({
      key: 'cached',
      address: 'Cached Place · Lombardia',
      lat: 45.46,
      lon: 9.19,
    })
    mockedLocation.reverseGeocodeAsync.mockRejectedValue(new Error('offline'))
    await expect(reverseGeocodeCoords(45.4601, 9.1901)).resolves.toBe(
      'Cached Place · Lombardia'
    )
  })

  it('reuses the same-cell result without a second network call', async () => {
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([
      {
        name: null,
        street: null,
        streetNumber: null,
        city: 'Milano',
        district: null,
        subregion: null,
        region: 'Lombardia',
        country: 'Italy',
        postalCode: null,
        isoCountryCode: 'IT',
        timezone: null,
        formattedAddress: null,
      },
    ] as never)

    await expect(reverseGeocodeCoords(45.4642, 9.1901)).resolves.toBe(
      'Milano · Lombardia'
    )
    await expect(reverseGeocodeCoords(45.4644, 9.1902)).resolves.toBe(
      'Milano · Lombardia'
    )
    expect(mockedLocation.reverseGeocodeAsync).toHaveBeenCalledTimes(1)
  })
})
