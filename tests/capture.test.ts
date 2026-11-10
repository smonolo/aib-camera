jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('@/lib/composite', () => ({
  compositeStampOntoPhoto: jest.fn(),
}))
jest.mock('@/lib/exif', () => ({
  writeCaptureExif: jest.fn(),
}))
jest.mock('@/lib/media', () => ({
  saveToAibAlbum: jest.fn(),
  deleteLocalPhotoFiles: jest.fn(async () => undefined),
}))
jest.mock('@/lib/persist-photo', () => ({
  persistRawPhoto: jest.fn(),
  persistRawVideo: jest.fn(),
}))
jest.mock('@/lib/video-stamp', () => ({
  VIDEO_MAX_DURATION_SEC: 60,
  stampVideoCapture: jest.fn(),
}))
jest.mock('@/lib/storage', () => ({
  recordCapture: jest.fn(),
  setCaptureMediaAssetId: jest.fn(),
}))
jest.mock('@/lib/config', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/config')>('@/lib/config')
  return {
    ...actual,
    newCaptureId: jest.fn(() => '11111111-2222-4333-8444-555555555555'),
  }
})

const mockGetSharedGeoSnapshot = jest.fn()
const mockGetGeoSourceState = jest.fn()
const mockCaptureGeoSnapshot = jest.fn()

jest.mock('@/lib/use-live-geo', () => ({
  getSharedGeoSnapshot: (...args: unknown[]) =>
    mockGetSharedGeoSnapshot(...args),
}))

jest.mock('@/lib/geo-source', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/geo-source')>('@/lib/geo-source')
  return {
    ...actual,
    getGeoSourceState: (...args: unknown[]) => mockGetGeoSourceState(...args),
  }
})

jest.mock('@/lib/location', () => {
  const actual =
    jest.requireActual<typeof import('@/lib/location')>('@/lib/location')
  return {
    ...actual,
    captureGeoSnapshot: (...args: unknown[]) => mockCaptureGeoSnapshot(...args),
  }
})

const mockGetCachedWindSync = jest.fn(
  (_lat: number, _lon: number): import('@/lib/types').WindSnapshot | null =>
    null
)

jest.mock('@/lib/wind', () => ({
  getCachedWindSync: (lat: number, lon: number) =>
    mockGetCachedWindSync(lat, lon),
}))

import {
  finalizeCapture,
  finalizeVideoCapture,
  resolveCaptureGeo,
} from '@/lib/capture'
import { compositeStampOntoPhoto } from '@/lib/composite'
import { writeCaptureExif } from '@/lib/exif'
import { saveToAibAlbum } from '@/lib/media'
import { persistRawPhoto, persistRawVideo } from '@/lib/persist-photo'
import { recordCapture, setCaptureMediaAssetId } from '@/lib/storage'
import { stampVideoCapture } from '@/lib/video-stamp'
import {
  DEFAULT_STAMP_SETTINGS,
  type GeoSnapshot,
  type StickyTarget,
  type WindSnapshot,
} from '@/lib/types'

const takenAt = new Date('2024-07-15T14:30:45.000Z')
const captureId = '11111111-2222-4333-8444-555555555555'

const sticky: StickyTarget = {
  lat: 45.47,
  lon: 9.2,
  address: 'Aimed',
  distanceM: 200,
  lockedHeading: 45,
  lockedAt: '2024-07-15T14:30:00.000Z',
}

function snap(overrides: Partial<GeoSnapshot> = {}): GeoSnapshot {
  return {
    lat: 45.4642,
    lon: 9.19,
    accuracy: 8,
    altitude: 120,
    heading: 90,
    address: 'Milano',
    takenAt,
    isAimedTarget: false,
    targetDistanceM: null,
    ...overrides,
  }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  mockGetSharedGeoSnapshot.mockReturnValue({
    lat: 45.4642,
    lon: 9.19,
    accuracy: 8,
    altitude: 120,
    heading: 90,
    address: 'Milano',
    takenAt,
  })
  mockGetGeoSourceState.mockReturnValue({ mode: 'me', sticky: null })
  ;(compositeStampOntoPhoto as jest.Mock).mockResolvedValue(
    'file:///captures/stamped.jpg'
  )
  ;(persistRawPhoto as jest.Mock).mockResolvedValue('file:///captures/raw.jpg')
  ;(persistRawVideo as jest.Mock).mockResolvedValue(
    'file:///captures/raw-video.mp4'
  )
  ;(stampVideoCapture as jest.Mock).mockResolvedValue({
    uri: 'file:///captures/stamped.mp4',
    durationMs: 4500,
    posterUri: 'file:///captures/poster.jpg',
    stamped: true,
  })
  ;(writeCaptureExif as jest.Mock).mockResolvedValue(true)
  ;(recordCapture as jest.Mock).mockResolvedValue(undefined)
  ;(saveToAibAlbum as jest.Mock).mockResolvedValue('asset-1')
  ;(setCaptureMediaAssetId as jest.Mock).mockResolvedValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('resolveCaptureGeo', () => {
  it('returns aimed target when target mode is active', async () => {
    mockGetGeoSourceState.mockReturnValue({ mode: 'target', sticky })
    const result = await resolveCaptureGeo()
    expect(result.isAimedTarget).toBe(true)
    expect(result.lat).toBe(45.47)
    expect(result.lon).toBe(9.2)
    expect(result.heading).toBe(45)
    expect(result.accuracy).toBeNull()
    expect(result.targetDistanceM).toBe(200)
    expect(mockCaptureGeoSnapshot).not.toHaveBeenCalled()
  })

  it('returns live GPS in me mode when coords exist', async () => {
    const result = await resolveCaptureGeo()
    expect(result.isAimedTarget).toBe(false)
    expect(result.lat).toBe(45.4642)
    expect(result.lon).toBe(9.19)
    expect(mockCaptureGeoSnapshot).not.toHaveBeenCalled()
  })

  it('merges cached wind synchronously without fetching', async () => {
    const wind: WindSnapshot = {
      speedKmh: 14,
      directionDeg: 180,
      fetchedAt: Date.now(),
      lat: 45.4642,
      lon: 9.19,
    }
    mockGetCachedWindSync.mockReturnValueOnce(wind)
    const result = await resolveCaptureGeo()
    expect(result.wind).toEqual(wind)
    expect(mockGetCachedWindSync).toHaveBeenCalledWith(45.4642, 9.19)
  })

  it('falls back to one-shot GPS when live coords are missing', async () => {
    mockGetSharedGeoSnapshot.mockReturnValue({
      lat: null,
      lon: null,
      accuracy: null,
      altitude: null,
      heading: 10,
      address: null,
      takenAt,
    })
    mockCaptureGeoSnapshot.mockResolvedValue({
      lat: 45.1,
      lon: 9.1,
      accuracy: 12,
      altitude: null,
      heading: 10,
      address: 'Fallback',
      takenAt,
    })

    const result = await resolveCaptureGeo()
    expect(result.lat).toBe(45.1)
    expect(result.lon).toBe(9.1)
    expect(result.isAimedTarget).toBe(false)
    expect(mockCaptureGeoSnapshot).toHaveBeenCalledWith({
      headingHint: 10,
      positionTimeoutMs: 1500,
    })
  })

  it('keeps sticky available but uses me coords when toggled back', async () => {
    mockGetGeoSourceState.mockReturnValue({ mode: 'me', sticky })
    const result = await resolveCaptureGeo()
    expect(result.isAimedTarget).toBe(false)
    expect(result.lat).toBe(45.4642)
    expect(result.targetDistanceM).toBeNull()
  })

  it('returns an empty snapshot when geo resolution throws', async () => {
    mockGetGeoSourceState.mockImplementation(() => {
      throw new Error('geo store boom')
    })
    const result = await resolveCaptureGeo()
    expect(result.lat).toBeNull()
    expect(result.lon).toBeNull()
    expect(result.address).toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('finalizeCapture', () => {
  it('stamps, writes EXIF, records capture, and links album asset', async () => {
    const settings = {
      ...DEFAULT_STAMP_SETTINGS,
      customLines: ['Squadra Nord'],
    }
    const geo = snap()

    const record = await finalizeCapture(
      'file:///tmp/camera.jpg',
      geo,
      settings
    )
    await flushMicrotasks()

    expect(compositeStampOntoPhoto).toHaveBeenCalledWith(
      'file:///tmp/camera.jpg',
      expect.objectContaining({
        infoLines: expect.any(Array),
        customLines: ['Squadra Nord'],
      }),
      settings,
      undefined
    )
    expect(persistRawPhoto).not.toHaveBeenCalled()
    expect(writeCaptureExif).toHaveBeenCalledWith(
      'file:///captures/stamped.jpg',
      geo,
      { captureId, customLines: ['Squadra Nord'] }
    )
    expect(recordCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        id: captureId,
        uri: 'file:///captures/stamped.jpg',
        kind: 'photo',
        mediaLibraryAssetId: null,
        takenAt: takenAt.toISOString(),
        lat: 45.4642,
        lon: 9.19,
        customText: ['Squadra Nord'],
        stampConfigSnapshot: settings,
        durationMs: null,
        posterUri: null,
      })
    )
    expect(saveToAibAlbum).toHaveBeenCalledWith('file:///captures/stamped.jpg')
    expect(setCaptureMediaAssetId).toHaveBeenCalledWith(captureId, 'asset-1')
    expect(record).toMatchObject({
      id: captureId,
      uri: 'file:///captures/stamped.jpg',
      mediaLibraryAssetId: null,
    })
  })

  it('keeps an unstamped photo when composite fails', async () => {
    ;(compositeStampOntoPhoto as jest.Mock).mockRejectedValue(
      new Error('skia boom')
    )

    const record = await finalizeCapture(
      'file:///tmp/camera.jpg',
      snap(),
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(persistRawPhoto).toHaveBeenCalledWith('file:///tmp/camera.jpg')
    expect(record.uri).toBe('file:///captures/raw.jpg')
    expect(writeCaptureExif).toHaveBeenCalledWith(
      'file:///captures/raw.jpg',
      expect.any(Object),
      expect.objectContaining({ captureId })
    )
    expect(saveToAibAlbum).toHaveBeenCalledWith('file:///captures/raw.jpg')
  })

  it('records aimed-target coordinates into the capture log', async () => {
    const aimed = snap({
      lat: sticky.lat,
      lon: sticky.lon,
      accuracy: null,
      altitude: null,
      heading: sticky.lockedHeading,
      address: sticky.address,
      isAimedTarget: true,
      targetDistanceM: sticky.distanceM,
    })

    await finalizeCapture(
      'file:///tmp/camera.jpg',
      aimed,
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(recordCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: sticky.lat,
        lon: sticky.lon,
        accuracy: null,
        altitude: null,
        heading: sticky.lockedHeading,
        address: sticky.address,
      })
    )
    expect(compositeStampOntoPhoto).toHaveBeenCalledWith(
      'file:///tmp/camera.jpg',
      expect.objectContaining({
        infoLines: expect.arrayContaining(['Punto mirato (stimato)']),
      }),
      DEFAULT_STAMP_SETTINGS,
      undefined
    )
  })

  it('forwards stamp layout options for map saves', async () => {
    await finalizeCapture(
      'file:///tmp/map.jpg',
      snap(),
      DEFAULT_STAMP_SETTINGS,
      {
        minScale: 0,
        referenceMultiplier: 0.72,
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        shadowColor: 'rgba(255,255,255,0.9)',
      }
    )

    expect(compositeStampOntoPhoto).toHaveBeenCalledWith(
      'file:///tmp/map.jpg',
      expect.any(Object),
      DEFAULT_STAMP_SETTINGS,
      {
        minScale: 0,
        referenceMultiplier: 0.72,
        textColor: '#000000',
        backgroundColor: '#FFFFFF',
        shadowColor: 'rgba(255,255,255,0.9)',
      }
    )
  })

  it('still returns a record when EXIF write fails', async () => {
    ;(writeCaptureExif as jest.Mock).mockRejectedValue(new Error('no exify'))

    const record = await finalizeCapture(
      'file:///tmp/camera.jpg',
      snap(),
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(record.id).toBe(captureId)
    expect(recordCapture).toHaveBeenCalled()
    expect(saveToAibAlbum).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })

  it('still returns a record when gallery persist fails', async () => {
    ;(recordCapture as jest.Mock).mockRejectedValue(new Error('disk full'))

    const record = await finalizeCapture(
      'file:///tmp/camera.jpg',
      snap(),
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(record.uri).toBe('file:///captures/stamped.jpg')
    expect(saveToAibAlbum).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })

  it('ignores Photos album failures without blocking the record', async () => {
    ;(saveToAibAlbum as jest.Mock).mockRejectedValue(new Error('no photos'))

    const record = await finalizeCapture(
      'file:///tmp/camera.jpg',
      snap(),
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(record.id).toBe(captureId)
    expect(setCaptureMediaAssetId).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
  })
})

describe('finalizeVideoCapture', () => {
  it('stamps video, records capture, and links album asset', async () => {
    const settings = {
      ...DEFAULT_STAMP_SETTINGS,
      customLines: ['Squadra Nord'],
    }
    const geo = snap()

    const record = await finalizeVideoCapture(
      'file:///tmp/camera.mp4',
      geo,
      settings
    )
    await flushMicrotasks()

    expect(persistRawVideo).toHaveBeenCalledWith('file:///tmp/camera.mp4')
    expect(stampVideoCapture).toHaveBeenCalledWith(
      'file:///captures/raw-video.mp4',
      geo,
      expect.objectContaining({
        customLines: ['Squadra Nord'],
      }),
      settings,
      undefined
    )
    expect(writeCaptureExif).not.toHaveBeenCalled()
    expect(recordCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        id: captureId,
        uri: 'file:///captures/stamped.mp4',
        kind: 'video',
        durationMs: 4500,
        posterUri: 'file:///captures/poster.jpg',
      })
    )
    expect(saveToAibAlbum).toHaveBeenCalledWith('file:///captures/stamped.mp4')
    expect(record.kind).toBe('video')
  })

  it('persists unstamped video when stamp soft-fails', async () => {
    ;(stampVideoCapture as jest.Mock).mockResolvedValue({
      uri: 'file:///captures/raw-video.mp4',
      durationMs: 2000,
      posterUri: null,
      stamped: false,
    })

    const record = await finalizeVideoCapture(
      'file:///tmp/camera.mp4',
      snap(),
      DEFAULT_STAMP_SETTINGS
    )
    await flushMicrotasks()

    expect(persistRawVideo).toHaveBeenCalledWith('file:///tmp/camera.mp4')
    expect(stampVideoCapture).toHaveBeenCalledWith(
      'file:///captures/raw-video.mp4',
      expect.anything(),
      expect.anything(),
      DEFAULT_STAMP_SETTINGS,
      undefined
    )
    expect(record.uri).toBe('file:///captures/raw-video.mp4')
    expect(record.kind).toBe('video')
  })
})
