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

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn(),
}))

jest.mock('@/lib/persist-photo', () => ({
  capturesDirectory: jest.fn(() => '/tmp/captures'),
  persistJpegCopy: jest.fn(async () => 'file:///tmp/poster-from-thumb.jpg'),
}))

const mockWrite = jest.fn(async () => undefined)
const mockCreate = jest.fn()
const mockExists = true

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...parts: string[]) => {
    const uri =
      parts.length >= 2 ? `${parts[0]}/${parts[1]}` : String(parts[0] ?? '')
    return {
      create: mockCreate,
      write: mockWrite,
      exists: mockExists,
      uri,
    }
  }),
}))

const mockEncodeToBytes = jest.fn(() => new Uint8Array([1, 2, 3]))
const mockMakeImageSnapshot = jest.fn(() => ({
  encodeToBytes: mockEncodeToBytes,
}))
const mockGetCanvas = jest.fn(() => ({
  clear: jest.fn(),
  drawCircle: jest.fn(),
  drawPath: jest.fn(),
}))
const mockSurface = {
  getCanvas: mockGetCanvas,
  makeImageSnapshot: mockMakeImageSnapshot,
}

jest.mock('@shopify/react-native-skia', () => ({
  ImageFormat: { JPEG: 3 },
  Skia: {
    Surface: { MakeOffscreen: jest.fn(() => mockSurface) },
    Color: jest.fn((value: string) => value),
    Paint: jest.fn(() => ({
      setColor: jest.fn(),
    })),
    Path: {
      Polygon: jest.fn(() => ({})),
    },
    Point: jest.fn((x: number, y: number) => ({ x, y })),
  },
}))

import * as VideoThumbnails from 'expo-video-thumbnails'
import { Skia } from '@shopify/react-native-skia'

import { persistJpegCopy } from '@/lib/persist-photo'
import { extractVideoPoster } from '@/lib/video-poster'

describe('extractVideoPoster', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///tmp/thumb.jpg',
      width: 100,
      height: 100,
    })
    ;(Skia.Surface.MakeOffscreen as jest.Mock).mockReturnValue(mockSurface)
    mockEncodeToBytes.mockReturnValue(new Uint8Array([1, 2, 3]))
  })

  it('prefers a thumbnail frame when available', async () => {
    const uri = await extractVideoPoster('file:///tmp/clip.mp4')
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(
      'file:///tmp/clip.mp4',
      { time: 0, quality: 0.72 }
    )
    expect(persistJpegCopy).toHaveBeenCalledWith(
      'file:///tmp/thumb.jpg',
      'aib-poster'
    )
    expect(uri).toBe('file:///tmp/poster-from-thumb.jpg')
    expect(Skia.Surface.MakeOffscreen).not.toHaveBeenCalled()
  })

  it('falls back to a Skia placeholder when thumbnails fail', async () => {
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(
      new Error('no thumb')
    )

    const uri = await extractVideoPoster('file:///tmp/clip.mp4')

    expect(Skia.Surface.MakeOffscreen).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalled()
    expect(uri).toMatch(/\/tmp\/captures\/aib-poster-\d+\.jpg$/)
  })

  it('returns null when thumbnail and placeholder both fail', async () => {
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(
      new Error('no thumb')
    )
    ;(Skia.Surface.MakeOffscreen as jest.Mock).mockReturnValue(null)

    await expect(extractVideoPoster('file:///tmp/clip.mp4')).resolves.toBeNull()
  })

  it('soft-fails when the thumbnail API returns no uri', async () => {
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue({
      uri: '',
      width: 0,
      height: 0,
    })

    const uri = await extractVideoPoster('file:///tmp/clip.mp4')
    expect(persistJpegCopy).not.toHaveBeenCalled()
    expect(uri).toMatch(/\/tmp\/captures\/aib-poster-\d+\.jpg$/)
  })
})
