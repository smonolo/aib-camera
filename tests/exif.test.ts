import { Platform } from 'react-native'

import { buildCaptureExifTags, writeCaptureExif } from '@/lib/exif'
import type { GeoSnapshot } from '@/lib/types'

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.2.3',
    ios: { buildNumber: '9' },
    android: { versionCode: 9 },
  },
  nativeAppVersion: '1.2.3',
  nativeBuildVersion: '9',
}))

const takenAt = new Date('2024-07-15T14:30:45.000Z')

function geo(overrides: Partial<GeoSnapshot> = {}): GeoSnapshot {
  return {
    lat: 45.464211,
    lon: 9.190011,
    accuracy: 4.5,
    altitude: 120.4,
    heading: 350,
    address: '  Piazza Duomo  ',
    takenAt,
    ...overrides,
  }
}

describe('buildCaptureExifTags', () => {
  it('writes identity, datetime, GPS, and machine-readable comment', () => {
    const tags = buildCaptureExifTags(geo(), {
      captureId: '11111111-2222-4333-8444-555555555555',
      customLines: ['Squadra Nord', '  ', 'Turno A'],
    })

    const versionLabel =
      Platform.OS === 'ios' || Platform.OS === 'android' ? '1.2.3 (9)' : '1.2.3'

    expect(tags.Software).toBe(`AIB Camera ${versionLabel}`)
    expect(tags.Artist).toBe('AIB Camera')
    expect(tags.ImageUniqueID).toBe('11111111-2222-4333-8444-555555555555')
    expect(tags.DateTime).toBe('2024:07:15 16:30:45')
    expect(tags.DateTimeOriginal).toBe(tags.DateTime)
    expect(tags.DateTimeDigitized).toBe(tags.DateTime)
    expect(tags.GPSLatitude).toBe(45.464211)
    expect(tags.GPSLongitude).toBe(9.190011)
    expect(tags.GPSAltitude).toBe(120.4)
    expect(tags.GPSAltitudeRef).toBe(0)
    expect(tags.GPSImgDirection).toBe(350)
    expect(tags.GPSImgDirectionRef).toBe('T')
    expect(tags.GPSHPositioningError).toBe(4.5)
    expect(tags.GPSDateStamp).toBe('2024:07:15')
    expect(tags.GPSTimeStamp).toBe('14:30:45')
    expect(tags.ImageDescription).toContain('Piazza Duomo')
    expect(tags.ImageDescription).toContain('Squadra Nord / Turno A')

    const payload = JSON.parse(String(tags.UserComment))
    expect(payload).toMatchObject({
      app: 'AIB Camera',
      version: versionLabel,
      id: '11111111-2222-4333-8444-555555555555',
      lat: 45.464211,
      lon: 9.190011,
      accuracy_m: 4.5,
      altitude_m: 120.4,
      heading_deg: 350,
      address: 'Piazza Duomo',
      custom: ['Squadra Nord', 'Turno A'],
      timezone: 'Europe/Rome',
    })
    expect(payload.taken_at).toBe(takenAt.toISOString())
  })

  it('omits GPS fields when coordinates are unavailable', () => {
    const tags = buildCaptureExifTags(
      geo({
        lat: null,
        lon: null,
        accuracy: null,
        altitude: null,
        heading: null,
        address: null,
      }),
      { captureId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }
    )

    expect(tags.GPSLatitude).toBeUndefined()
    expect(tags.GPSLongitude).toBeUndefined()
    expect(tags.GPSAltitude).toBeUndefined()
    expect(tags.GPSImgDirection).toBeUndefined()
    expect(tags.GPSHPositioningError).toBeUndefined()
    expect(tags.ImageDescription).not.toContain('null')

    const payload = JSON.parse(String(tags.UserComment))
    expect(payload.lat).toBeUndefined()
    expect(payload.lon).toBeUndefined()
    expect(payload.address).toBeUndefined()
  })

  it('marks negative altitude below sea level', () => {
    const tags = buildCaptureExifTags(geo({ altitude: -12 }), {
      captureId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
    })
    expect(tags.GPSAltitude).toBe(12)
    expect(tags.GPSAltitudeRef).toBe(1)
  })

  it('normalizes heading into 0..360', () => {
    const tags = buildCaptureExifTags(geo({ heading: -10 }), {
      captureId: 'cccccccc-dddd-4eee-8fff-000000000000',
    })
    expect(tags.GPSImgDirection).toBe(350)
  })
})

describe('writeCaptureExif', () => {
  it('returns false when the Exify native module is missing', async () => {
    const ok = await writeCaptureExif('file:///tmp/aib.jpg', geo(), {
      captureId: 'dddddddd-eeee-4fff-8000-111111111111',
    })
    expect(ok).toBe(false)
  })
})
