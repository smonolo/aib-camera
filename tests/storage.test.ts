import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  addCapture,
  appendAuditLogEntry,
  findNearestGeocodeCache,
  getCapture,
  getLatestCapture,
  loadAuditLog,
  loadCaptures,
  loadStampSettings,
  recordCapture,
  removeCaptures,
  resetStorageCaches,
  saveStampSettings,
  setCaptureMediaAssetId,
  upsertGeocodeCacheEntry,
} from '@/lib/storage'
import { DEFAULT_STAMP_SETTINGS, type CaptureRecord } from '@/lib/types'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

function capture(overrides: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    uri: 'file:///captures/aib-1.jpg',
    mediaLibraryAssetId: null,
    takenAt: '2024-07-15T14:30:45.000Z',
    lat: 45.46,
    lon: 9.19,
    accuracy: 5,
    altitude: 100,
    heading: 90,
    address: 'Milano',
    customText: ['AIB Camera'],
    stampConfigSnapshot: DEFAULT_STAMP_SETTINGS,
    ...overrides,
  }
}

beforeEach(async () => {
  resetStorageCaches()
  await AsyncStorage.clear()
})

describe('captures', () => {
  it('stores and retrieves captures newest-first', async () => {
    await addCapture(
      capture({
        id: 'older',
        takenAt: '2024-07-15T10:00:00.000Z',
      })
    )
    await addCapture(
      capture({
        id: 'newer',
        takenAt: '2024-07-15T12:00:00.000Z',
      })
    )

    const list = await loadCaptures()
    expect(list.map(item => item.id)).toEqual(['newer', 'older'])
    expect(await getCapture('newer')).toMatchObject({ id: 'newer' })
    expect(await getLatestCapture()).toMatchObject({ id: 'newer' })
  })

  it('removes selected captures', async () => {
    await addCapture(capture({ id: 'keep' }))
    await addCapture(capture({ id: 'drop' }))
    await removeCaptures(['drop'])
    expect((await loadCaptures()).map(item => item.id)).toEqual(['keep'])
  })

  it('stores media library asset ids', async () => {
    await addCapture(capture({ id: 'shot' }))
    await setCaptureMediaAssetId('shot', 'asset-9')
    expect(await getCapture('shot')).toMatchObject({
      mediaLibraryAssetId: 'asset-9',
    })
  })

  it('normalizes legacy captures without mediaLibraryAssetId', async () => {
    await AsyncStorage.setItem(
      'aib-camera.captures.v1',
      JSON.stringify([
        {
          id: 'legacy',
          uri: 'file:///captures/legacy.jpg',
          takenAt: '2024-07-15T14:30:45.000Z',
          lat: 45.46,
          lon: 9.19,
          customText: ['AIB Camera'],
          stampConfigSnapshot: DEFAULT_STAMP_SETTINGS,
        },
      ])
    )
    resetStorageCaches()

    const loaded = await getCapture('legacy')
    expect(loaded?.mediaLibraryAssetId).toBeNull()
  })
})

describe('audit log', () => {
  it('appends entries and ignores duplicates', async () => {
    const entry = {
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      takenAt: '2024-07-15T14:30:45.000Z',
      lat: 45.46,
      lon: 9.19,
    }
    await appendAuditLogEntry(entry)
    await appendAuditLogEntry(entry)

    const log = await loadAuditLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toEqual(entry)
  })

  it('survives gallery deletes', async () => {
    const record = capture()
    await recordCapture(record)
    await removeCaptures([record.id])

    expect(await loadCaptures()).toEqual([])
    expect(await loadAuditLog()).toEqual([
      {
        id: record.id,
        takenAt: record.takenAt,
        lat: record.lat,
        lon: record.lon,
      },
    ])
  })
})

describe('stamp settings persistence', () => {
  it('round-trips settings through AsyncStorage', async () => {
    await saveStampSettings({
      ...DEFAULT_STAMP_SETTINGS,
      showHeading: false,
      fontSize: 'large',
    })
    const loaded = await loadStampSettings()
    expect(loaded.showHeading).toBe(false)
    expect(loaded.fontSize).toBe('large')
  })
})

describe('geocode cache', () => {
  it('returns the nearest cached address within max distance', async () => {
    await upsertGeocodeCacheEntry({
      key: 'far',
      address: 'Far Away',
      lat: 46.0,
      lon: 10.0,
    })
    await upsertGeocodeCacheEntry({
      key: 'near',
      address: 'Nearby Place',
      lat: 45.464,
      lon: 9.19,
    })

    const hit = await findNearestGeocodeCache(45.4642, 9.1901, 2500)
    expect(hit?.address).toBe('Nearby Place')

    const miss = await findNearestGeocodeCache(45.4642, 9.1901, 5)
    expect(miss).toBeNull()
  })
})
