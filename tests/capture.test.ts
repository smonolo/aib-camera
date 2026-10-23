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

import { resolveCaptureGeo } from '@/lib/capture'
import type { StickyTarget } from '@/lib/types'

const takenAt = new Date('2024-07-15T14:30:45.000Z')

const sticky: StickyTarget = {
  lat: 45.47,
  lon: 9.2,
  address: 'Aimed',
  distanceM: 200,
  lockedHeading: 45,
  lockedAt: '2024-07-15T14:30:00.000Z',
}

beforeEach(() => {
  jest.clearAllMocks()
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
})

describe('resolveCaptureGeo', () => {
  it('returns aimed target when target mode is active', async () => {
    mockGetGeoSourceState.mockReturnValue({ mode: 'target', sticky })
    const snap = await resolveCaptureGeo()
    expect(snap.isAimedTarget).toBe(true)
    expect(snap.lat).toBe(45.47)
    expect(snap.lon).toBe(9.2)
    expect(snap.heading).toBe(45)
    expect(snap.accuracy).toBeNull()
    expect(snap.targetDistanceM).toBe(200)
    expect(mockCaptureGeoSnapshot).not.toHaveBeenCalled()
  })

  it('returns live GPS in me mode when coords exist', async () => {
    const snap = await resolveCaptureGeo()
    expect(snap.isAimedTarget).toBe(false)
    expect(snap.lat).toBe(45.4642)
    expect(snap.lon).toBe(9.19)
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

    const snap = await resolveCaptureGeo()
    expect(snap.lat).toBe(45.1)
    expect(snap.lon).toBe(9.1)
    expect(snap.isAimedTarget).toBe(false)
    expect(mockCaptureGeoSnapshot).toHaveBeenCalledWith({
      headingHint: 10,
      positionTimeoutMs: 1500,
    })
  })

  it('keeps sticky available but uses me coords when toggled back', async () => {
    mockGetGeoSourceState.mockReturnValue({ mode: 'me', sticky })
    const snap = await resolveCaptureGeo()
    expect(snap.isAimedTarget).toBe(false)
    expect(snap.lat).toBe(45.4642)
    expect(snap.targetDistanceM).toBeNull()
  })
})
