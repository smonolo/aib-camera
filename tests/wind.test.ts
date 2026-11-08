jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import AsyncStorage from '@react-native-async-storage/async-storage'

import { resetStorageCaches } from '@/lib/storage'
import {
  fetchCurrentWind,
  getCachedWindSync,
  resetWindMemory,
  resolveWind,
} from '@/lib/wind'

const lat = 45.4642
const lon = 9.19

beforeEach(async () => {
  resetWindMemory()
  resetStorageCaches()
  await AsyncStorage.clear()
  jest.restoreAllMocks()
})

describe('fetchCurrentWind', () => {
  it('parses Open-Meteo current wind', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          wind_speed_10m: 12.4,
          wind_direction_10m: 225,
        },
      }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const wind = await fetchCurrentWind(lat, lon)
    expect(wind).toEqual(
      expect.objectContaining({
        speedKmh: 12.4,
        directionDeg: 225,
        lat,
        lon,
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('open-meteo.com')
  })

  it('returns null on failed response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as unknown as typeof fetch

    expect(await fetchCurrentWind(lat, lon)).toBeNull()
  })
})

describe('resolveWind / cache', () => {
  it('caches a successful fetch for sync capture reuse', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          wind_speed_10m: 10,
          wind_direction_10m: 90,
        },
      }),
    }) as unknown as typeof fetch

    const wind = await resolveWind(lat, lon)
    expect(wind?.speedKmh).toBe(10)
    expect(getCachedWindSync(lat, lon)?.directionDeg).toBe(90)
    expect(getCachedWindSync(lat + 0.05, lon)).toBeNull()
  })

  it('reuses sticky cache without a second network call', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          wind_speed_10m: 8,
          wind_direction_10m: 0,
        },
      }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await resolveWind(lat, lon)
    await resolveWind(lat + 0.001, lon + 0.001)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
