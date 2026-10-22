import { Album, Asset, getPermissionsAsync } from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { saveToAibAlbum, sharePhotos } from '@/lib/media'

jest.mock('expo-media-library', () => ({
  Album: {
    get: jest.fn(),
    create: jest.fn(),
  },
  Asset: {
    create: jest.fn(),
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })

describe('saveToAibAlbum', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws when photo library permission is denied', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    const { requestPermissionsAsync } = jest.requireMock('expo-media-library')
    requestPermissionsAsync.mockResolvedValue({ granted: false })

    await expect(saveToAibAlbum('file:///a.jpg')).rejects.toThrow(
      /libreria foto|Photo library/i
    )
  })

  it('adds to an existing album when present', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Album.get as jest.Mock).mockResolvedValue({ id: 'album-1' })
    ;(Asset.create as jest.Mock).mockResolvedValue({ id: 'asset-1' })

    await saveToAibAlbum('file:///a.jpg')

    expect(Asset.create).toHaveBeenCalledWith('file:///a.jpg', {
      id: 'album-1',
    })
    expect(Album.create).not.toHaveBeenCalled()
  })

  it('creates the album when missing', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Album.get as jest.Mock).mockRejectedValue(new Error('missing'))
    ;(Asset.create as jest.Mock).mockResolvedValue({ id: 'asset-1' })

    await saveToAibAlbum('file:///a.jpg')

    expect(Album.create).toHaveBeenCalledWith(
      'AIB Camera',
      [{ id: 'asset-1' }],
      false
    )
  })
})

describe('sharePhotos', () => {
  const original = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: original,
    })
  })

  it('no-ops for an empty list', async () => {
    await sharePhotos([])
    expect(Sharing.shareAsync).not.toHaveBeenCalled()
    expect(Share.share).not.toHaveBeenCalled()
  })

  it('dedupes URIs and uses expo-sharing for a single photo', async () => {
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true)
    await sharePhotos(['file:///a.jpg', 'file:///a.jpg', ''])
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1)
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///a.jpg',
      expect.objectContaining({ mimeType: 'image/jpeg' })
    )
  })

  it('shares multiple URLs together on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    await sharePhotos(['file:///a.jpg', 'file:///b.jpg'])
    expect(Share.share).toHaveBeenCalledWith({
      urls: ['file:///a.jpg', 'file:///b.jpg'],
    })
  })
})
