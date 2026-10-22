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

/** Saves into the «AIB Camera» album. Returns the media-library asset id. */
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

/**
 * Deletes assets from the system Photos / MediaStore library.
 * Best-effort: no-ops when permission is denied or an asset is already gone.
 */
export async function deleteMediaLibraryAssets(
  assetIds: string[]
): Promise<void> {
  const unique = [...new Set(assetIds.filter(Boolean))]
  if (unique.length === 0) return

  const granted = await ensureMediaLibraryPermission(false)
  if (!granted) return

  try {
    await Asset.delete(unique.map(id => new Asset(id)))
  } catch (error) {
    console.warn('Media library delete failed', error)
  }
}

/** Removes local capture JPEGs from app documents storage. Best-effort. */
export async function deleteLocalPhotoFiles(uris: string[]): Promise<void> {
  const unique = [...new Set(uris.filter(Boolean))]
  for (const uri of unique) {
    try {
      const file = new File(uri)
      if (file.exists) file.delete()
    } catch (error) {
      console.warn('Local photo delete failed', error)
    }
  }
}

/**
 * Deletes photos from the in-app gallery, local files, and system Photos album.
 * Audit log entries are kept. Media-library and file deletes are best-effort.
 */
export async function deleteCaptures(ids: string[]): Promise<CaptureRecord[]> {
  if (ids.length === 0) return loadCaptures()

  const remove = new Set(ids)
  const existing = await loadCaptures()
  const doomed = existing.filter(item => remove.has(item.id))
  if (doomed.length === 0) return existing

  const assetIds = doomed
    .map(item => item.mediaLibraryAssetId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
  const uris = doomed.map(item => item.uri)

  await Promise.all([
    deleteMediaLibraryAssets(assetIds),
    deleteLocalPhotoFiles(uris),
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
  const unique = [...new Set(uris.filter(Boolean))]
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
