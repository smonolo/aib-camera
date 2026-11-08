jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

const mockDelete = jest.fn()
const mockExists = jest.fn(() => true)

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    get exists() {
      return mockExists()
    },
    delete: mockDelete,
  })),
}))

jest.mock('@/lib/config', () => ({
  APP_NAME: 'AIB Camera',
  appVersionLabel: () => '1.3.0',
}))

jest.mock('@/lib/video-poster', () => ({
  extractVideoPoster: jest.fn(async () => 'file:///tmp/poster.jpg'),
}))

jest.mock('@/lib/persist-photo', () => ({
  newCaptureOutputUri: jest.fn(
    (ext: string) => `file:///tmp/out.${ext || 'mp4'}`
  ),
}))

jest.mock('@/lib/composite', () => ({
  renderStampOverlayPng: jest.fn(async () => 'file:///tmp/overlay.png'),
}))

import {
  resetVideoStampForTests,
  setNitroModulesAvailableForTests,
  stampVideoCapture,
  VIDEO_MAX_DURATION_SEC,
} from '@/lib/video-stamp'
import { extractVideoPoster } from '@/lib/video-poster'
import { DEFAULT_STAMP_SETTINGS, type GeoSnapshot } from '@/lib/types'

const snap: GeoSnapshot = {
  lat: 45.46,
  lon: 9.19,
  accuracy: 5,
  altitude: 100,
  heading: 90,
  address: 'Milano',
  takenAt: new Date('2024-07-15T14:30:45.000Z'),
}

const content = {
  infoLines: ['45.460000° N, 9.190000° E'],
  customLines: ['Squadra Nord'],
}

describe('stampVideoCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockExists.mockReturnValue(true)
    resetVideoStampForTests()
    setNitroModulesAvailableForTests(false)
    ;(extractVideoPoster as jest.Mock).mockResolvedValue(
      'file:///tmp/poster.jpg'
    )
  })

  afterEach(() => {
    resetVideoStampForTests()
  })

  it('exports the 60 second clip cap', () => {
    expect(VIDEO_MAX_DURATION_SEC).toBe(60)
  })

  it('soft-fails to the unstamped clip when Nitro is missing', async () => {
    const result = await stampVideoCapture(
      'file:///tmp/raw.mp4',
      snap,
      content,
      DEFAULT_STAMP_SETTINGS
    )

    expect(result).toEqual({
      uri: 'file:///tmp/raw.mp4',
      durationMs: 0,
      posterUri: 'file:///tmp/poster.jpg',
      stamped: false,
    })
    expect(extractVideoPoster).toHaveBeenCalledWith('file:///tmp/raw.mp4')
  })

  it('still returns a poster when the pipeline is missing', async () => {
    ;(extractVideoPoster as jest.Mock).mockResolvedValue(null)
    const result = await stampVideoCapture(
      'file:///tmp/raw.mp4',
      snap,
      content,
      DEFAULT_STAMP_SETTINGS
    )
    expect(result.stamped).toBe(false)
    expect(result.posterUri).toBeNull()
  })
})
