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
}))
jest.mock('@/lib/persist-photo', () => ({
  persistRawPhoto: jest.fn(),
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

import { finalizeCapture, resolveCaptureGeo } from '@/lib/capture'
import { compositeStampOntoPhoto } from '@/lib/composite'
import { writeCaptureExif } from '@/lib/exif'
import { saveToAibAlbum } from '@/lib/media'
import { persistRawPhoto } from '@/lib/persist-photo'
import { recordCapture, setCaptureMediaAssetId } from '@/lib/storage'
import {
  DEFAULT_STAMP_SETTINGS,
  type GeoSnapshot,
  type StickyTarget,
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
      settings
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
        mediaLibraryAssetId: null,
        takenAt: takenAt.toISOString(),
        lat: 45.4642,
        lon: 9.19,
        customText: ['Squadra Nord'],
        stampConfigSnapshot: settings,
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
