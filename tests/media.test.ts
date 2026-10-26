import { File } from 'expo-file-system'
import { Album, Asset, getPermissionsAsync } from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Share } from 'react-native'

import {
  deleteCaptures,
  deleteLocalPhotoFiles,
  deleteMediaLibraryAssets,
  saveToAibAlbum,
  sharePhotos,
} from '@/lib/media'
import {
  addCapture,
  loadAuditLog,
  loadCaptures,
  recordCapture,
} from '@/lib/storage'
import { DEFAULT_STAMP_SETTINGS, type CaptureRecord } from '@/lib/types'

jest.mock('expo-media-library', () => ({
  Album: {
    get: jest.fn(),
    create: jest.fn(),
  },
  Asset: Object.assign(
    jest.fn().mockImplementation((id: string) => ({ id })),
    {
      create: jest.fn(),
      delete: jest.fn(),
    }
  ),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}))

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    exists: true,
    delete: jest.fn(),
  })),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}))

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.spyOn(Share, 'share').mockResolvedValue({
  action: 'sharedAction',
  activityType: undefined,
})

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

  it('adds to an existing album when present and returns asset id', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Album.get as jest.Mock).mockResolvedValue({ id: 'album-1' })
    ;(Asset.create as jest.Mock).mockResolvedValue({ id: 'asset-1' })

    await expect(saveToAibAlbum('file:///a.jpg')).resolves.toBe('asset-1')

    expect(Asset.create).toHaveBeenCalledWith('file:///a.jpg', {
      id: 'album-1',
    })
    expect(Album.create).not.toHaveBeenCalled()
  })

  it('creates the album when missing', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Album.get as jest.Mock).mockRejectedValue(new Error('missing'))
    ;(Asset.create as jest.Mock).mockResolvedValue({ id: 'asset-1' })

    await expect(saveToAibAlbum('file:///a.jpg')).resolves.toBe('asset-1')

    expect(Album.create).toHaveBeenCalledWith(
      'AIB Camera',
      [{ id: 'asset-1' }],
      false
    )
  })
})

describe('deleteMediaLibraryAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no-ops for an empty list', async () => {
    await deleteMediaLibraryAssets([])
    expect(getPermissionsAsync).not.toHaveBeenCalled()
    expect(Asset.delete).not.toHaveBeenCalled()
  })

  it('skips delete when permission is denied', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    const { requestPermissionsAsync } = jest.requireMock('expo-media-library')
    requestPermissionsAsync.mockResolvedValue({ granted: false })

    await deleteMediaLibraryAssets(['asset-1'])
    expect(Asset.delete).not.toHaveBeenCalled()
  })

  it('deletes assets when permission is granted', async () => {
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Asset.delete as jest.Mock).mockResolvedValue(undefined)

    await deleteMediaLibraryAssets(['asset-1', 'asset-1', ''])

    expect(getPermissionsAsync).toHaveBeenCalledWith(false, ['photo'])
    expect(Asset.delete).toHaveBeenCalledWith([{ id: 'asset-1' }])
  })
})

describe('deleteLocalPhotoFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('deletes existing local files', async () => {
    const deleteFn = jest.fn()
    ;(File as unknown as jest.Mock).mockImplementation((uri: string) => ({
      uri,
      exists: true,
      delete: deleteFn,
    }))

    await deleteLocalPhotoFiles(['file:///a.jpg', 'file:///a.jpg', ''])

    expect(File).toHaveBeenCalledWith('file:///a.jpg')
    expect(deleteFn).toHaveBeenCalledTimes(1)
  })
})

describe('deleteCaptures', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    const AsyncStorage = require('@react-native-async-storage/async-storage')
    const { resetStorageCaches } = require('@/lib/storage')
    resetStorageCaches()
    await AsyncStorage.clear()
    ;(getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(Asset.delete as jest.Mock).mockResolvedValue(undefined)
  })

  it('removes gallery entries, media assets, and local files but keeps the audit log', async () => {
    const deleteFn = jest.fn()
    ;(File as unknown as jest.Mock).mockImplementation((uri: string) => ({
      uri,
      exists: true,
      delete: deleteFn,
    }))

    const record = capture({
      id: 'drop-me',
      mediaLibraryAssetId: 'ph://asset-1',
      uri: 'file:///captures/drop.jpg',
    })
    await recordCapture(record)
    await addCapture(
      capture({
        id: 'keep-me',
        uri: 'file:///captures/keep.jpg',
        takenAt: '2024-07-15T12:00:00.000Z',
      })
    )

    await deleteCaptures(['drop-me'])

    expect(Asset.delete).toHaveBeenCalledWith([{ id: 'ph://asset-1' }])
    expect(File).toHaveBeenCalledWith('file:///captures/drop.jpg')
    expect(deleteFn).toHaveBeenCalled()
    expect((await loadCaptures()).map(item => item.id)).toEqual(['keep-me'])
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

describe('sharePhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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

  it('shares multiple photos one at a time', async () => {
    ;(Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true)
    await sharePhotos(['file:///a.jpg', 'file:///b.jpg'])
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(2)
    expect(Sharing.shareAsync).toHaveBeenNthCalledWith(
      1,
      'file:///a.jpg',
      expect.objectContaining({ mimeType: 'image/jpeg' })
    )
    expect(Sharing.shareAsync).toHaveBeenNthCalledWith(
      2,
      'file:///b.jpg',
      expect.objectContaining({ mimeType: 'image/jpeg' })
    )
  })
})
