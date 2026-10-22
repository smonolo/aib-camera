import { File } from 'expo-file-system'
import {
  Album,
  Asset,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Platform, Share } from 'react-native'

import { APP_NAME } from './config'
import { t } from './i18n'
import { loadCaptures, removeCaptures } from './storage'
import type { CaptureRecord } from './types'
import { uniqueStrings } from './util'

const ALBUM_NAME = APP_NAME
const PHOTO_GRANULAR = ['photo'] as const

async function ensureMediaLibraryPermission(
  writeOnly: boolean
): Promise<boolean> {
  const current = await getPermissionsAsync(writeOnly, [...PHOTO_GRANULAR])
  if (current.granted) return true

  const requested = await requestPermissionsAsync(writeOnly, [
    ...PHOTO_GRANULAR,
  ])
  return requested.granted
}

export async function saveToAibAlbum(uri: string): Promise<string> {
  const granted = await ensureMediaLibraryPermission(true)
  if (!granted) {
    throw new Error(t().media.permissionDenied)
  }

  try {
    const existing = await Album.get(ALBUM_NAME)
    if (existing) {
      const asset = await Asset.create(uri, existing)
      return asset.id
    }
  } catch {}

  const asset = await Asset.create(uri)
  await Album.create(ALBUM_NAME, [asset], false)
  return asset.id
}

export async function deleteMediaLibraryAssets(
  assetIds: Array<string | null | undefined>
): Promise<void> {
  const unique = uniqueStrings(assetIds)
  if (unique.length === 0) return

  const granted = await ensureMediaLibraryPermission(false)
  if (!granted) return

  try {
    await Asset.delete(unique.map(id => new Asset(id)))
  } catch (error) {
    console.warn('Media library delete failed', error)
  }
}

export async function deleteLocalPhotoFiles(
  uris: Array<string | null | undefined>
): Promise<void> {
  for (const uri of uniqueStrings(uris)) {
    try {
      const file = new File(uri)
      if (file.exists) file.delete()
    } catch (error) {
      console.warn('Local photo delete failed', error)
    }
  }
}

export async function deleteCaptures(ids: string[]): Promise<CaptureRecord[]> {
  if (ids.length === 0) return loadCaptures()

  const remove = new Set(ids)
  const existing = await loadCaptures()
  const doomed = existing.filter(item => remove.has(item.id))
  if (doomed.length === 0) return existing

  await Promise.all([
    deleteMediaLibraryAssets(doomed.map(item => item.mediaLibraryAssetId)),
    deleteLocalPhotoFiles(doomed.map(item => item.uri)),
    removeCaptures(ids),
  ])

  return loadCaptures()
}

export async function deleteCapture(id: string): Promise<CaptureRecord[]> {
  return deleteCaptures([id])
}

export async function sharePhoto(uri: string): Promise<void> {
  await sharePhotos([uri])
}

export async function sharePhotos(uris: string[]): Promise<void> {
  const copy = t()
  const unique = uniqueStrings(uris)
  if (unique.length === 0) return

  if (unique.length === 1) {
    const uri = unique[0]!
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: copy.media.shareDialogTitle,
        UTI: 'public.jpeg',
      })
      return
    }

    await Share.share(
      Platform.OS === 'ios'
        ? { url: uri }
        : { message: uri, title: copy.media.shareTitle }
    )
    return
  }

  if (Platform.OS === 'ios') {
    await Share.share({ urls: unique } as never)
    return
  }

  for (const uri of unique) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: copy.media.shareDialogTitle,
        UTI: 'public.jpeg',
      })
    } else {
      await Share.share({ message: uri, title: copy.media.shareTitle })
    }
  }
}
